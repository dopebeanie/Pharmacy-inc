# Pharmacy INC. — статичный плеер (GitHub Pages)

Исполнитель: **ЛОСТЕНСОУЛ**. Два альбома, 50 треков. Только статика:
HTML5 + CSS3 + vanilla JS (ES modules). Бэкенда нет, track-файлы подхватываются
из `assets/audio/`.

## Структура (`docs/` — корень сайта для Pages)

```
docs/
  index.html
  .nojekyll
  assets/css/styles.css
  assets/js/app.js | player.js | data.js | ui.js | icons.js
  assets/covers/pharmacy-1.jpg, pharmacy-2.jpg, artist.jpg
  assets/audio/pharmacy-1/ | pharmacy-2/   (заполняется скриптом, в git не входит)
  data/albums.json | tracks.json
  data/lyrics/p1-01.txt … p2-30.txt
  tools/copy-audio.ps1 | audio-map.json
  tools/serve.py
```

## Запуск локально (нужен Python)

```powershell
cd docs
python tools/serve.py
# открыть http://localhost:8000
```

ВАЖНО: используйте именно `tools/serve.py`, а не `python -m http.server`.
Обычный сервер не отдаёт HTTP Range (куски файла), и браузер не может
мотать трек в незагруженную часть. `serve.py` отдаёт 206 Partial Content,
плюс отключает кэш. Через `file://` плеер не заработает (блокировка модулей).

## Выложить на GitHub Pages

1. Закоммитьте `docs/` (аудио — по желанию, см. ниже).
2. GitHub → Settings → Pages → Deploy from branch → Branch: `main`, Folder: `/docs`.
3. Открыть `https://<user>.github.io/<repo>/`. Все пути относительные —
   подпапка поддерживается. `.nojekyll` уже лежит в `docs/`.

## Аудио: как добавить

Аудио не входит в git (FLAC второго альбома — сотни МБ):

```powershell
powershell -ExecutionPolicy Bypass -File docs/tools/copy-audio.ps1
```

Скрипт копирует `server/content/...` → `docs/assets/audio/...` с ASCII-именами
из `tools/audio-map.json` (совпадают с `data/tracks.json`). Для Pages тяжёлый
FLAC рекомендуется пережать:

```powershell
powershell -ExecutionPolicy Bypass -File docs/tools/copy-audio.ps1 -TranscodeMp3
# нужен ffmpeg в PATH; затем заменить .flac -> .mp3 в data/tracks.json
# и пересобрать assets/js/data.js (см. ниже)
```

## Замена контента

- **Трек/название/длительность**: правьте `data/tracks.json`, затем пересоберите
  fallback: `python C:\Users\Takira\AppData\Local\Temp\opencode\gen_datajs.py`
  (генераторы лежат в `%TEMP%\opencode\gen_data*.py`; при переносе сохраните их).
- **Альбом**: `data/albums.json` (название, год, описание, обложка, trackIds).
- **Текст**: `data/lyrics/p1-XX.txt` / `p2-XX.txt` (UTF-8). Поддерживается LRC
  с таймкодами `[mm:ss.xx]` — включится подсветка строк. Нет файла —
  плеер покажет «Текст недоступен».
- **Обложки**: `assets/covers/pharmacy-1.jpg`, `pharmacy-2.jpg`, `artist.jpg`
  (сейчас `artist.jpg` — сгенерированная заглушка, TODO: заменить фото).

## Что сделано / допущения (TODO)

- Метаданные сверены со страницами релизов: порядок треков совпал полностью
  (20 + 30), названия приведены к каноническим (в т.ч. «Triplesixredcode (Intro)»,
  «Холода», «On Me (Instrumental)», «Empty Room (Autro)», «lies & pain.»,
  «Who you? (Outro)»), проставлены гости (feat.) и продюсеры.
- Pharmacy I: релиз 8 августа 2024. Pharmacy II: релиз 14 декабря 2024.
- Биография в hero-блоке — со страницы артиста: независимый исполнитель,
  продюсер, создатель «Dishonesty Crew», в индустрии с 2019 года, AKA poisonluv.
- Фото `assets/covers/artist.jpg` — с той же страницы (750×1000).
- FLAC оставлен как есть; для веба лучше MP3/Opus (см. `-TranscodeMp3`).
- Внешняя зависимость: Google Fonts (Unbounded + Manrope, кириллица).
  Без сети сайт работает на системных шрифтах.
