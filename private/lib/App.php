<?php
declare(strict_types=1);

final class App
{
    public static function run(Router $router): void
    {
        $request = null;
        try {
            $request = Request::fromGlobals();
            self::securityHeaders($request);
            self::cors($request);

            if ($request->method === 'OPTIONS') {
                JsonResponse::noContent()->send();
                return;
            }

            $result = $router->dispatch($request);
            $response = $result instanceof JsonResponse ? $result : new JsonResponse($result);
            $response->send();
        } catch (HttpException $e) {
            $error = ['code' => $e->errorCode, 'message' => $e->getMessage()];
            if ($e->fields) {
                $error['fields'] = $e->fields;
            }
            (new JsonResponse(['error' => $error], $e->status, $e->headers))->send();
        } catch (Throwable $e) {
            error_log(sprintf('[%s] %s in %s:%d', get_class($e), $e->getMessage(), $e->getFile(), $e->getLine()));
            $error = ['code' => 'server_error', 'message' => 'Internal server error'];
            if (!is_production()) {
                $error['debug'] = $e->getMessage();
            }
            (new JsonResponse(['error' => $error], 500))->send();
        }
    }

    private static function securityHeaders(Request $request): void
    {
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
        header('Cache-Control: no-store');
        if ($request->isHttps()) {
            header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
        }
    }

    private static function cors(Request $request): void
    {
        $origin = $request->header('Origin');
        if ($origin === null) {
            return;
        }
        if (in_array($origin, config('CORS_ORIGINS', []), true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Authorization, Content-Type');
            header('Access-Control-Max-Age: 600');
        }
    }
}

