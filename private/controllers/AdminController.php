<?php
declare(strict_types=1);

final class AdminController
{
    /** Métricas gerais do sistema e status operacional */
    public static function stats(Request $req): array
    {
        AuthService::requireAdmin($req);
        $pdo = db();

        $totalUsers = (int) $pdo->query('SELECT COUNT(*) FROM users WHERE deleted_at IS NULL')->fetchColumn();
        $premiumUsers = (int) $pdo->prepare('SELECT COUNT(*) FROM users WHERE premium_until > ? AND deleted_at IS NULL')
            ->execute([now_utc()]) ? $pdo->query("SELECT COUNT(*) FROM users WHERE premium_until > '" . now_utc() . "' AND deleted_at IS NULL")->fetchColumn() : 0;
        
        $totalPurchases = (int) $pdo->query('SELECT COUNT(*) FROM purchases')->fetchColumn();
        $totalPhrases = (int) $pdo->query('SELECT COUNT(*) FROM phrasebook')->fetchColumn();
        $totalItineraries = (int) $pdo->query('SELECT COUNT(*) FROM itineraries')->fetchColumn();
        $webhookLogs = (int) $pdo->query('SELECT COUNT(*) FROM payment_webhooks_log')->fetchColumn();

        return [
            'metrics' => [
                'total_users' => $totalUsers,
                'premium_users' => (int) $premiumUsers,
                'total_purchases' => $totalPurchases,
                'total_phrases' => $totalPhrases,
                'total_itineraries' => $totalItineraries,
                'webhooks_received' => $webhookLogs,
            ],
            'server_time' => gmdate('c'),
        ];
    }

    /** Listagem de usuários com status */
    public static function users(Request $req): array
    {
        AuthService::requireAdmin($req);
        $st = db()->query(
            'SELECT id, name, email, role, country_of_origin, preferred_language, premium_until,
                    email_verified_at, created_at, deleted_at
               FROM users ORDER BY id DESC LIMIT 50'
        );

        $users = array_map(function ($u) {
            return [
                'id' => (int) $u['id'],
                'name' => $u['name'],
                'email' => $u['email'],
                'role' => $u['role'],
                'country' => $u['country_of_origin'],
                'lang' => $u['preferred_language'],
                'is_premium' => AuthService::isPremium($u),
                'premium_until' => iso_time($u['premium_until']),
                'email_verified' => $u['email_verified_at'] !== null,
                'created_at' => iso_time($u['created_at']),
                'deleted' => $u['deleted_at'] !== null,
            ];
        }, $st->fetchAll());

        return ['users' => $users];
    }

    /** CRUD: Listar frases com todas as traduções */
    public static function listPhrases(Request $req): array
    {
        AuthService::requireAdmin($req);
        $pdo = db();

        $phrases = $pdo->query('SELECT * FROM phrasebook ORDER BY category, sort_order, id')->fetchAll();
        $translations = $pdo->query('SELECT * FROM phrasebook_translations')->fetchAll();

        $tByPhrase = [];
        foreach ($translations as $t) {
            $tByPhrase[$t['phrase_id']][$t['lang']] = $t;
        }

        $items = [];
        foreach ($phrases as $p) {
            $id = (int) $p['id'];
            $items[] = [
                'id' => $id,
                'category' => $p['category'],
                'sort_order' => (int) $p['sort_order'],
                'translations' => [
                    'pt' => $tByPhrase[$id]['pt']['phrase_text'] ?? '',
                    'en' => $tByPhrase[$id]['en']['phrase_text'] ?? '',
                    'es' => $tByPhrase[$id]['es']['phrase_text'] ?? '',
                ],
                'phonetics' => [
                    'en' => $tByPhrase[$id]['en']['phonetic'] ?? '',
                    'es' => $tByPhrase[$id]['es']['phonetic'] ?? '',
                ],
                'audio_url' => $tByPhrase[$id]['pt']['audio_url'] ?? null,
            ];
        }

        return ['phrases' => $items];
    }

    /** CRUD: Criar nova frase com traduções */
    public static function createPhrase(Request $req): JsonResponse
    {
        AuthService::requireAdmin($req);
        $input = $req->input();

        $v = new Validator($input);
        $category = $v->in('category', ['general', 'casual', 'dining', 'transport', 'emergency', 'shopping', 'health']);
        $sortOrder = (int) ($input['sort_order'] ?? 0);
        $pt = $v->string('pt', 1, 255);
        $en = $v->string('en', 1, 255);
        $es = $v->string('es', 1, 255, false);
        $v->validate();

        $pdo = db();
        $pdo->beginTransaction();
        try {
            $pdo->prepare('INSERT INTO phrasebook (category, sort_order) VALUES (?, ?)')
                ->execute([$category, $sortOrder]);
            $phraseId = (int) $pdo->lastInsertId();

            $ins = $pdo->prepare(
                'INSERT INTO phrasebook_translations (phrase_id, lang, phrase_text, phonetic, audio_url)
                 VALUES (?, ?, ?, ?, ?)'
            );
            // Linha PT (fonte nativa)
            $ins->execute([$phraseId, 'pt', $pt, null, $input['audio_url'] ?? null]);
            // Linha EN
            $ins->execute([$phraseId, 'en', $en, $input['phonetic_en'] ?? null, null]);
            // Linha ES
            if (!empty($es)) {
                $ins->execute([$phraseId, 'es', $es, $input['phonetic_es'] ?? null, null]);
            }

            $pdo->commit();
            return new JsonResponse(['created' => true, 'id' => $phraseId], 201);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /** CRUD: Atualizar frase existente */
    public static function updatePhrase(Request $req): array
    {
        AuthService::requireAdmin($req);
        $id = (int) ($req->params['id'] ?? 0);
        $input = $req->input();

        $pdo = db();
        $phrase = $pdo->prepare('SELECT id FROM phrasebook WHERE id = ?');
        $phrase->execute([$id]);
        if (!$phrase->fetch()) {
            throw new HttpException(404, 'not_found', 'Phrase not found');
        }

        $pdo->beginTransaction();
        try {
            if (isset($input['category']) || isset($input['sort_order'])) {
                $category = $input['category'] ?? 'general';
                $sort = (int) ($input['sort_order'] ?? 0);
                $pdo->prepare('UPDATE phrasebook SET category = ?, sort_order = ? WHERE id = ?')
                    ->execute([$category, $sort, $id]);
            }

            $upd = $pdo->prepare(
                'INSERT INTO phrasebook_translations (phrase_id, lang, phrase_text, phonetic, audio_url)
                 VALUES (?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE phrase_text = VALUES(phrase_text), phonetic = VALUES(phonetic), audio_url = VALUES(audio_url)'
            );

            // Suporte compatível SQLite / MySQL para UPSERT
            foreach (['pt', 'en', 'es'] as $lang) {
                if (isset($input[$lang]) && trim((string) $input[$lang]) !== '') {
                    $text = trim((string) $input[$lang]);
                    $phonetic = $input["phonetic_{$lang}"] ?? null;
                    $audio = ($lang === 'pt') ? ($input['audio_url'] ?? null) : null;

                    // Deleta e reinsere para funcionar de forma idêntica em MySQL e SQLite
                    $pdo->prepare('DELETE FROM phrasebook_translations WHERE phrase_id = ? AND lang = ?')
                        ->execute([$id, $lang]);
                    $pdo->prepare('INSERT INTO phrasebook_translations (phrase_id, lang, phrase_text, phonetic, audio_url) VALUES (?, ?, ?, ?, ?)')
                        ->execute([$id, $lang, $text, $phonetic, $audio]);
                }
            }

            $pdo->commit();
            return ['updated' => true];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /** CRUD: Excluir frase */
    public static function deletePhrase(Request $req): JsonResponse
    {
        AuthService::requireAdmin($req);
        $id = (int) ($req->params['id'] ?? 0);
        db()->prepare('DELETE FROM phrasebook WHERE id = ?')->execute([$id]);
        return JsonResponse::noContent();
    }

    /** CRUD: Listar todos os roteiros (incluindo despublicados) */
    public static function listItineraries(Request $req): array
    {
        AuthService::requireAdmin($req);
        $pdo = db();

        $itineraries = $pdo->query('SELECT * FROM itineraries ORDER BY id DESC')->fetchAll();
        $translations = $pdo->query('SELECT * FROM itinerary_translations')->fetchAll();

        $tByIt = [];
        foreach ($translations as $t) {
            $tByIt[$t['itinerary_id']][$t['lang']] = $t;
        }

        $items = [];
        foreach ($itineraries as $it) {
            $id = (int) $it['id'];
            $items[] = [
                'id' => $id,
                'region' => $it['destination_region'],
                'is_premium' => (bool) $it['is_premium'],
                'duration_days' => (int) $it['duration_days'],
                'is_published' => (bool) $it['is_published'],
                'content_updated_at' => iso_time($it['content_updated_at']),
                'title_en' => $tByIt[$id]['en']['title'] ?? '',
                'title_pt' => $tByIt[$id]['pt']['title'] ?? '',
                'description_pt' => $tByIt[$id]['pt']['description'] ?? '',
            ];
        }

        return ['itineraries' => $items];
    }

    /** Publicar ou Despublicar roteiro */
    public static function togglePublishItinerary(Request $req): array
    {
        AuthService::requireAdmin($req);
        $id = (int) ($req->params['id'] ?? 0);
        $published = (bool) $req->get('is_published', true);

        $st = db()->prepare('UPDATE itineraries SET is_published = ?, content_updated_at = ? WHERE id = ?');
        $st->execute([$published ? 1 : 0, now_utc(), $id]);

        return ['id' => $id, 'is_published' => $published];
    }

    /** Visualização de Compras e Webhooks do Stripe */
    public static function purchases(Request $req): array
    {
        AuthService::requireAdmin($req);
        $st = db()->query(
            'SELECT p.*, u.email, u.name
               FROM purchases p
               JOIN users u ON u.id = p.user_id
              ORDER BY p.id DESC LIMIT 50'
        );

        $purchases = array_map(function ($p) {
            return [
                'id' => (int) $p['id'],
                'user_email' => $p['email'],
                'user_name' => $p['name'],
                'plan_type' => $p['plan_type'],
                'status' => $p['status'],
                'currency' => $p['currency'],
                'amount' => (float) $p['amount'],
                'start' => iso_time($p['current_period_start']),
                'end' => iso_time($p['current_period_end']),
                'created_at' => iso_time($p['created_at']),
            ];
        }, $st->fetchAll());

        return ['purchases' => $purchases];
    }

    /** Logs de Webhook para auditoria e conferência com painel do Stripe */
    public static function webhookLogs(Request $req): array
    {
        AuthService::requireAdmin($req);
        $st = db()->query('SELECT id, event_id, event_type, processed_at FROM payment_webhooks_log ORDER BY id DESC LIMIT 50');
        return ['webhooks' => $st->fetchAll()];
    }
}

