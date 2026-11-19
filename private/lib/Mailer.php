<?php
declare(strict_types=1);

final class Mailer
{
    public static function send(string $to, string $subject, string $body): void
    {
        $driver = config('MAIL.driver', 'log');

        if ($driver === 'log') {
            $entry = sprintf(
                "[%s] To: %s\nSubject: %s\n\n%s\n%s\n",
                gmdate('c'),
                $to,
                $subject,
                $body,
                str_repeat('-', 60)
            );
            file_put_contents(PRIVATE_PATH . '/storage/logs/mail.log', $entry, FILE_APPEND | LOCK_EX);
            return;
        }

        $fromName = '=?UTF-8?B?' . base64_encode((string) config('MAIL.from_name')) . '?=';
        $headers = implode("\r\n", [
            'From: ' . $fromName . ' <' . config('MAIL.from') . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: 8bit',
        ]);
        if (!mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers)) {
            error_log('Falha ao enviar e-mail (' . $subject . ')');
        }
    }

    /** Modelos de e-mail transacional por idioma. */
    public static function template(string $name, string $lang, array $vars): array
    {
        $t = [
            'verify' => [
                'en' => ['Confirm your e-mail', "Hi {name},\n\nConfirm your e-mail by opening the link below (valid for 48 hours):\n{link}\n\nIf you did not create an account, ignore this message."],
                'es' => ['Confirma tu correo', "Hola {name},\n\nConfirma tu correo abriendo el enlace (válido por 48 horas):\n{link}\n\nSi no creaste una cuenta, ignora este mensaje."],
                'pt' => ['Confirme seu e-mail', "Olá {name},\n\nConfirme seu e-mail abrindo o link abaixo (válido por 48 horas):\n{link}\n\nSe você não criou uma conta, ignore esta mensagem."],
            ],
            'reset' => [
                'en' => ['Reset your password', "Hi {name},\n\nUse the link below to set a new password (valid for 1 hour):\n{link}\n\nIf you did not request this, ignore this message."],
                'es' => ['Restablece tu contraseña', "Hola {name},\n\nUsa el enlace para definir una nueva contraseña (válido por 1 hora):\n{link}\n\nSi no lo solicitaste, ignora este mensaje."],
                'pt' => ['Redefina sua senha', "Olá {name},\n\nUse o link abaixo para definir uma nova senha (válido por 1 hora):\n{link}\n\nSe você não solicitou, ignore esta mensagem."],
            ],
        ];
        [$subject, $body] = $t[$name][supported_lang($lang)];
        foreach ($vars as $k => $v) {
            $body = str_replace('{' . $k . '}', (string) $v, $body);
        }
        return [$subject, $body];
    }
}

