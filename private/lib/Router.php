<?php
declare(strict_types=1);

final class Router
{
    /** @var array<int, array{method:string, regex:string, handler:callable}> */
    private array $routes = [];

    public function get(string $pattern, callable|array $handler): void { $this->add('GET', $pattern, $handler); }
    public function post(string $pattern, callable|array $handler): void { $this->add('POST', $pattern, $handler); }
    public function put(string $pattern, callable|array $handler): void { $this->add('PUT', $pattern, $handler); }
    public function delete(string $pattern, callable|array $handler): void { $this->add('DELETE', $pattern, $handler); }

    public function add(string $method, string $pattern, callable|array $handler): void
    {
        $regex = preg_replace('#\{([a-z_]+)\}#', '(?P<$1>[^/]+)', $pattern);
        $this->routes[] = ['method' => $method, 'regex' => '#^' . $regex . '$#', 'handler' => $handler];
    }

    public function dispatch(Request $request): mixed
    {
        $allowed = [];
        foreach ($this->routes as $route) {
            if (!preg_match($route['regex'], $request->path, $m)) {
                continue;
            }
            if ($route['method'] !== $request->method) {
                $allowed[] = $route['method'];
                continue;
            }
            $request->params = array_filter($m, 'is_string', ARRAY_FILTER_USE_KEY);
            return call_user_func($route['handler'], $request);
        }
        if ($allowed) {
            throw new HttpException(405, 'method_not_allowed', '', [], ['Allow' => implode(', ', array_unique($allowed))]);
        }
        throw new HttpException(404, 'not_found', 'Endpoint not found');
    }
}

