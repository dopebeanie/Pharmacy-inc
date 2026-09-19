# Аудиофайлы сюда не входят в git из-за размера (второй альбом — FLAC, сотни мегабайт).
#
# Как добавить звук:
#   1. Откройте PowerShell в корне репозитория.
#   2. Запустите: powershell -ExecutionPolicy Bypass -File docs/tools/copy-audio.ps1
#      Скрипт скопирует треки из server/content в assets/audio с ASCII-именами
#      из docs/tools/audio-map.json (те же пути, что ждут data/tracks.json).
#   3. Для GitHub Pages тяжёлый FLAC лучше пережать в MP3/Opus и обновить
#      расширения в data/tracks.json (поле src).
#
# Без файлов плеер откроется, покажет каталог и тексты, но при попытке
# воспроизведения покажет тост с подсказкой.
