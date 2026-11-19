<?php
declare(strict_types=1);

final class ConciergeController
{
    /** Lista os pedidos de consultoria assíncrona do próprio usuário autenticado */
    public static function myRequests(Request $req): array
    {
        $user = AuthService::user($req);
        $st = db()->prepare(
            'SELECT id, destination, travel_dates, travelers_count, budget_level, interests,
                    message, status, response_text, created_at, answered_at
               FROM concierge_requests
              WHERE user_id = ?
              ORDER BY id DESC'
        );
        $st->execute([$user['id']]);

        $rows = array_map(function ($r) {
            return [
                'id' => (int) $r['id'],
                'destination' => $r['destination'],
                'travel_dates' => $r['travel_dates'],
                'travelers_count' => (int) $r['travelers_count'],
                'budget_level' => $r['budget_level'],
                'interests' => $r['interests'],
                'message' => $r['message'],
                'status' => $r['status'],
                'response_text' => $r['response_text'],
                'created_at' => iso_time($r['created_at']),
                'answered_at' => iso_time($r['answered_at']),
            ];
        }, $st->fetchAll());

        return [
            'is_premium' => AuthService::isPremium($user),
            'requests' => $rows,
        ];
    }

    /** Cria uma nova solicitação de consultoria de roteiro (Exige usuário Premium) */
    public static function createRequest(Request $req): JsonResponse
    {
        $user = AuthService::user($req);

        // Conforme PRD v2.1: Concierge é benefício de assinantes/passes Premium
        if (!AuthService::isPremium($user)) {
            throw new HttpException(
                403,
                'premium_required',
                'O serviço de Concierge é exclusivo para membros Premium.'
            );
        }

        RateLimiter::hit('concierge|' . $user['id'], 5, 86400); // máx 5 solicitações por dia

        $v = new Validator($req->input());
        $dest = $v->string('destination', 2, 100);
        $dates = $v->string('travel_dates', 2, 100, false);
        $budget = $v->in('budget_level', ['budget', 'moderate', 'luxury'], 'moderate');
        $interests = $v->string('interests', 2, 255, false);
        $message = $v->string('message', 10, 2000);
        $v->validate();

        $travelers = max(1, min(20, (int) $req->get('travelers_count', 1)));

        $pdo = db();
        $pdo->prepare(
            'INSERT INTO concierge_requests (user_id, destination, travel_dates, travelers_count,
                budget_level, interests, message, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, "pending", ?, ?)'
        )->execute([
            $user['id'], $dest, $dates, $travelers,
            $budget, $interests, $message, now_utc(), now_utc(),
        ]);

        $id = (int) $pdo->lastInsertId();

        // Notifica por log / e-mail da equipe interna (conforme PRD resposta em até 24h úteis)
        Mailer::send(
            'concierge@braziltouristcompanion.local',
            "[Concierge #{id}] Nova solicitação de {$user['name']} para {$dest}",
            "Usuário: {$user['name']} ({$user['email']})\nDestino: {$dest}\nOrçamento: {$budget}\nMensagem: {$message}"
        );

        return new JsonResponse([
            'created' => true,
            'id' => $id,
            'sla' => 'Resposta humana por consultores locais em até 24 horas úteis.',
        ], 201);
    }

    /** Módulo 7 (Admin): Listar todas as solicitações de concierge pendentes ou respondidas */
    public static function adminList(Request $req): array
    {
        AuthService::requireAdmin($req);
        $st = db()->query(
            'SELECT c.*, u.name as user_name, u.email as user_email
               FROM concierge_requests c
               JOIN users u ON u.id = c.user_id
              ORDER BY CASE WHEN c.status = "pending" THEN 1 WHEN c.status = "in_review" THEN 2 ELSE 3 END, c.id DESC'
        );

        $items = array_map(function ($r) {
            return [
                'id' => (int) $r['id'],
                'user_name' => $r['user_name'],
                'user_email' => $r['user_email'],
                'destination' => $r['destination'],
                'travel_dates' => $r['travel_dates'],
                'travelers_count' => (int) $r['travelers_count'],
                'budget_level' => $r['budget_level'],
                'interests' => $r['interests'],
                'message' => $r['message'],
                'status' => $r['status'],
                'response_text' => $r['response_text'],
                'created_at' => iso_time($r['created_at']),
                'answered_at' => iso_time($r['answered_at']),
            ];
        }, $st->fetchAll());

        return ['requests' => $items];
    }

    /** Módulo 7 (Admin): Enviar resposta da consultoria humana */
    public static function adminAnswer(Request $req): array
    {
        AuthService::requireAdmin($req);
        $id = (int) ($req->params['id'] ?? 0);

        $v = new Validator($req->input());
        $response = $v->string('response_text', 10, 5000);
        $v->validate();

        $pdo = db();
        $st = $pdo->prepare('SELECT c.*, u.email, u.name, u.preferred_language FROM concierge_requests c JOIN users u ON u.id = c.user_id WHERE c.id = ?');
        $st->execute([$id]);
        $reqData = $st->fetch();

        if (!$reqData) {
            throw new HttpException(404, 'not_found', 'Solicitação de concierge não encontrada.');
        }

        $now = now_utc();
        $pdo->prepare('UPDATE concierge_requests SET status = "answered", response_text = ?, answered_at = ?, updated_at = ? WHERE id = ?')
            ->execute([$response, $now, $now, $id]);

        // Notifica o turista por e-mail que o roteiro foi respondido
        Mailer::send(
            $reqData['email'],
            "Seu roteiro personalizado para {$reqData['destination']} está pronto!",
            "Olá {$reqData['user_name']},\n\nNosso concierge respondeu à sua consultoria sobre {$reqData['destination']}.\n\nAcesse o app para conferir todos os detalhes e dicas da equipe local.\n\nAtenciosamente,\nEquipe Brasil Tourist Companion"
        );

        return ['answered' => true, 'id' => $id];
    }
}

