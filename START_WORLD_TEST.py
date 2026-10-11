#!/usr/bin/env python3
"""Only for local development. Never points at production D1 or real wallets."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from functools import partial
import webbrowser

ROOT = Path(__file__).resolve().parent

def main():
    server = None
    for port in range(8765, 8790):
        try:
            server = ThreadingHTTPServer(('127.0.0.1', port), partial(SimpleHTTPRequestHandler, directory=str(ROOT)))
            break
        except OSError:
            continue
    if server is None:
        raise RuntimeError('Не удалось найти свободный порт (8765-8789)')
    url = f'http://127.0.0.1:{server.server_address[1]}/index.html?world_preview=1'
    print('\nСладкий Забег + Мир Зеффи: локальное тестирование')
    print('Открыть:', url)
    print('Остановить: Ctrl+C\n')
    webbrowser.open(url)
    try:
        server.serve_forever(poll_interval=.3)
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()

if __name__ == '__main__':
    main()
