# vyrl auf Netlify veröffentlichen

## 1. Projekt zu GitHub hochladen

Entpacke die ZIP-Datei und lade den **gesamten Ordner** in ein neues GitHub-Repository.

Wichtig: Nicht nur `index.html` hochladen. Die Ordner `netlify/functions` sowie `package.json` und `netlify.toml` werden ebenfalls benötigt.

## 2. Mit Netlify verbinden

1. Öffne Netlify.
2. Wähle **Add new project**.
3. Wähle **Import an existing project**.
4. Verbinde GitHub und wähle dein Repository.
5. Netlify erkennt die Einstellungen automatisch.
6. Starte den Deploy.

## 3. OpenRouter aktivieren

Öffne in Netlify:

**Project configuration → Environment variables**

Lege diese Variable an:

```text
OPENROUTER_API_KEY
```

Als Wert verwendest du deinen OpenRouter-Key. Danach erneut deployen.

## 4. Instagram und Facebook verbinden

Du benötigst eine eigene Meta Developer App.

Trage anschließend in Netlify ein:

```text
META_APP_ID
META_APP_SECRET
```

In deiner Meta App muss diese Redirect-URL hinterlegt sein:

```text
https://DEINE-SEITE.netlify.app/api/oauth/meta/callback
```

Danach kannst du in vyrl auf **Mit Meta verbinden** klicken.

## 5. Weitere Plattformen

Für TikTok, LinkedIn, YouTube und X werden ebenfalls eigene Developer Apps benötigt. Die benötigten Variablen stehen in `.env.example`.

## Was bereits funktioniert

- sichere OpenRouter-Aufrufe über Netlify
- Content- und Linkanalyse
- Auswahl eines OpenRouter-Videomodells
- Video-Erstellung und öffentliche Server-URL
- Instagram-Publishing über das Backend
- Meta-OAuth-Grundfluss
- Social-OAuth-Grundfluss für weitere Plattformen
- gespeicherter Tagesplan
- Scheduler im 15-Minuten-Takt

## Was du nicht tun solltest

- keine echten Keys in `index.html` eintragen
- keine `.env`-Datei zu GitHub hochladen
- nicht nur die HTML-Datei per Netlify Drop veröffentlichen, wenn du Automatisierung möchtest

## Hinweis

Meta, TikTok, LinkedIn, Google und X können eine App-Prüfung verlangen. Das Projekt stellt die technische Struktur bereit; die Freigabe der jeweiligen Plattform kann nicht automatisiert werden.
