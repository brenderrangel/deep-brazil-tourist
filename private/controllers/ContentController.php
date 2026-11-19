<?php
declare(strict_types=1);

final class ContentController
{
    private const CATEGORIES = ['general', 'casual', 'dining', 'transport', 'emergency', 'shopping', 'health'];

    public static function phrasebook(Request $req): JsonResponse
    {
        $lang = supported_lang($req->query('lang'));
        $category = $req->query('category');

        $sql = 'SELECT p.id, p.category, t.lang, t.phrase_text, t.phonetic, t.audio_url
                  FROM phrasebook p
                  JOIN phrasebook_translations t ON t.phrase_id = p.id
                 WHERE t.lang IN (?, ?, ?)';
        $params = [$lang, 'pt', 'en'];
        if ($category !== null && $category !== '') {
            if (!in_array($category, self::CATEGORIES, true)) {
                throw new HttpException(422, 'validation_error', 'Invalid category', ['category' => 'invalid_value']);
            }
            $sql .= ' AND p.category = ?';
            $params[] = $category;
        }
        $sql .= ' ORDER BY p.category, p.sort_order, p.id';

        $st = db()->prepare($sql);
        $st->execute($params);

        $grouped = [];
        foreach ($st->fetchAll() as $r) {
            $grouped[$r['id']]['category'] = $r['category'];
            $grouped[$r['id']]['t'][$r['lang']] = $r;
        }

        $phrases = [];
        foreach ($grouped as $id => $g) {
            $own = $g['t'][$lang] ?? $g['t']['en'] ?? null;
            $pt = $g['t']['pt'] ?? null;
            if (!$own || !$pt) {
                continue;
            }
            $phrases[] = [
                'id' => (int) $id,
                'category' => $g['category'],
                'text' => $own['phrase_text'],
                'pt' => $pt['phrase_text'],
                'phonetic' => $lang === 'pt' ? null : $own['phonetic'],
                'audio_url' => $pt['audio_url'],
            ];
        }

        return new JsonResponse(
            ['lang' => $lang, 'categories' => self::CATEGORIES, 'phrases' => $phrases],
            200,
            ['Cache-Control' => 'public, max-age=300']
        );
    }

    public static function itineraries(Request $req): JsonResponse
    {
        $lang = supported_lang($req->query('lang'));
        $user = AuthService::user($req, false);
        $premium = AuthService::isPremium($user);

        $st = db()->prepare(
            'SELECT i.id, i.destination_region, i.is_premium, i.duration_days, i.content_updated_at,
                    t.lang, t.title, t.description
               FROM itineraries i
               JOIN itinerary_translations t ON t.itinerary_id = i.id
              WHERE i.is_published = 1 AND t.lang IN (?, ?)
              ORDER BY i.is_premium, i.id'
        );
        $st->execute([$lang, 'en']);

        $items = [];
        foreach ($st->fetchAll() as $r) {
            $id = (int) $r['id'];
            if (isset($items[$id]) && $r['lang'] !== $lang) {
                continue; // já temos a tradução preferida
            }
            $items[$id] = self::summary($r, $premium);
        }

        return new JsonResponse(
            ['lang' => $lang, 'is_premium_user' => $premium, 'itineraries' => array_values($items)],
            200,
            ['Cache-Control' => 'private, no-store']
        );
    }

    public static function itinerary(Request $req): JsonResponse
    {
        $id = filter_var($req->params['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($id === false) {
            throw new HttpException(404, 'not_found');
        }
        $lang = supported_lang($req->query('lang'));
        $user = AuthService::user($req, false);
        $premium = AuthService::isPremium($user);

        $st = db()->prepare(
            'SELECT i.id, i.destination_region, i.is_premium, i.duration_days, i.content_updated_at,
                    t.lang, t.title, t.description, t.content_json
               FROM itineraries i
               JOIN itinerary_translations t ON t.itinerary_id = i.id
              WHERE i.id = ? AND i.is_published = 1 AND t.lang IN (?, ?)'
        );
        $st->execute([$id, $lang, 'en']);
        $rows = $st->fetchAll();
        if (!$rows) {
            throw new HttpException(404, 'not_found', 'Itinerary not found');
        }
        $row = $rows[0];
        foreach ($rows as $r) {
            if ($r['lang'] === $lang) {
                $row = $r;
            }
        }

        $data = self::summary($row, $premium);
        // bloqueio validado no servidor: conteúdo premium só sai com premium_until válido
        $data['content'] = $data['locked'] ? null : json_decode((string) $row['content_json'], true);

        return new JsonResponse(['itinerary' => $data], 200, ['Cache-Control' => 'private, no-store']);
    }

    private static function summary(array $r, bool $premiumUser): array
    {
        $isPremium = (bool) $r['is_premium'];
        return [
            'id' => (int) $r['id'],
            'region' => $r['destination_region'],
            'is_premium' => $isPremium,
            'locked' => $isPremium && !$premiumUser,
            'duration_days' => (int) $r['duration_days'],
            'lang' => $r['lang'],
            'title' => $r['title'],
            'description' => $r['description'],
            'content_updated_at' => iso_time($r['content_updated_at']),
        ];
    }
}

