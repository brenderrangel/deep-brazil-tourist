<?php
declare(strict_types=1);

final class RatesController
{
    private const TTL = 3600; // 1 hora de cache conforme PRD
    private const SUPPORTED_BASES = ['USD', 'EUR', 'ARS', 'GBP'];

    // Cotações de referência/fallback (caso a rede externa esteja indisponível ou em sandbox)
    private const DEFAULT_RATES = [
        'USD' => ['BRL' => 5.45, 'commercial' => 5.45, 'cash_spread' => 0.05, 'card_spread' => 0.04],
        'EUR' => ['BRL' => 5.95, 'commercial' => 5.95, 'cash_spread' => 0.05, 'card_spread' => 0.04],
        'ARS' => ['BRL' => 0.0055, 'commercial' => 0.0055, 'cash_spread' => 0.10, 'card_spread' => 0.08],
        'GBP' => ['BRL' => 7.05, 'commercial' => 7.05, 'cash_spread' => 0.05, 'card_spread' => 0.04],
    ];

    public static function getRates(Request $req): JsonResponse
    {
        $base = strtoupper($req->query('base', 'USD') ?? 'USD');
        if (!in_array($base, self::SUPPORTED_BASES, true)) {
            $base = 'USD';
        }

        $cacheDir = PRIVATE_PATH . '/storage/cache';
        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0775, true);
        }
        $cacheFile = $cacheDir . "/rates_{$base}.json";

        $cachedData = null;
        if (is_file($cacheFile)) {
            $cachedData = json_decode((string) file_get_contents($cacheFile), true);
        }

        $now = time();
        $isExpired = !$cachedData || ($now - (int) ($cachedData['timestamp'] ?? 0)) > self::TTL;

        if ($isExpired) {
            $fresh = self::fetchFromExternalApi($base);
            if ($fresh !== null) {
                $cachedData = $fresh;
                file_put_contents($cacheFile, json_encode($cachedData, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
            } elseif (!$cachedData) {
                // Se a API falhou e não há cache prévio, usa a taxa de referência com flag
                $cachedData = [
                    'base' => $base,
                    'timestamp' => $now,
                    'updated_at' => gmdate('c', $now),
                    'rate_to_brl' => self::DEFAULT_RATES[$base]['BRL'],
                    'spreads' => [
                        'cash_estimated' => round(self::DEFAULT_RATES[$base]['BRL'] * (1 - self::DEFAULT_RATES[$base]['cash_spread']), 4),
                        'card_estimated' => round(self::DEFAULT_RATES[$base]['BRL'] * (1 + self::DEFAULT_RATES[$base]['card_spread']), 4),
                    ],
                    'is_fallback' => true,
                    'source' => 'Taxa de referência estimada (offline)',
                ];
            }
        }

        return new JsonResponse($cachedData, 200, [
            'Cache-Control' => 'public, max-age=300',
        ]);
    }

    private static function fetchFromExternalApi(string $base): ?array
    {
        // Tenta API pública de câmbio (open.er-api.com ou awesomeapi para BRL)
        $ctx = stream_context_create([
            'http' => [
                'timeout' => 3,
                'ignore_errors' => true,
                'header' => "User-Agent: BrasilTouristCompanion/2.1\r\n",
            ],
        ]);

        try {
            $url = "https://open.er-api.com/v6/latest/{$base}";
            $raw = @file_get_contents($url, false, $ctx);
            if ($raw === false) {
                return null;
            }
            $data = json_decode($raw, true);
            if (!isset($data['rates']['BRL'])) {
                return null;
            }

            $rate = (float) $data['rates']['BRL'];
            $now = time();

            return [
                'base' => $base,
                'timestamp' => $now,
                'updated_at' => gmdate('c', $now),
                'rate_to_brl' => round($rate, 4),
                'spreads' => [
                    // Cotações estimadas na ponta para o turista:
                    // Casas de câmbio físicas compram moeda estrangeira pagando ~4-6% a menos do que o comercial
                    'cash_estimated' => round($rate * 0.95, 4),
                    // Cartões internacionais praticam câmbio com spread bancário + impostos
                    'card_estimated' => round($rate * 1.04, 4),
                ],
                'is_fallback' => false,
                'source' => 'Cotação de mercado (open.er-api.com)',
            ];
        } catch (\Throwable) {
            return null;
        }
    }
}

