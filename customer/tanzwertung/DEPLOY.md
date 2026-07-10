# Deployment-Status

Architektur: statisches Frontend auf S3, Live-Wertungen ueber eine REST-API
(API Gateway + Lambda + DynamoDB). Das Frontend pollt alle 2 Sekunden
`GET /state` und schreibt Aenderungen per `POST /rate` / `POST /reset`.

## Aktuell live (AWS-Profil "private", Account 435676973415, Region eu-central-1)

- **Website:** https://www.steudler-it.com/customer/tanzwertung/
  (liegt im selben S3-Bucket `www.steudler-it.com` wie die Hauptseite, unter dem
  Praefix `customer/tanzwertung/`, ausgeliefert ueber die bestehende
  CloudFront-Distribution `ET7I2SRWY3SUN`)
- **API:** https://ldlwmzfld2.execute-api.eu-central-1.amazonaws.com/Prod
- **CloudFormation-Stack:** `tanzwertung` (Lambda-Funktionen `GetStateFunction`,
  `RateFunction`, `ResetFunction`, DynamoDB-Tabelle `RatingsTable`)
- **S3-Buckets:**
  - `www.steudler-it.com` – Hauptseiten-Bucket, Tanzwertung-Frontend liegt unter
    dem Praefix `customer/tanzwertung/`
  - `tanzwertung-sam-artifacts-435676973415` – private, nur CloudFormation-Deploy-Artefakte

Ein fruehrer eigenstaendiger Test-Bucket (`tanzwertung-frontend-435676973415`)
wurde wieder geloescht, nachdem der Pfad unter der Hauptdomain funktionierte –
es gibt jetzt nur noch die eine Live-URL oben.

Kosten: alles Pay-per-Request (Lambda, API Gateway, DynamoDB) bzw. wenige KB
Speicher auf S3 – bei geringer Nutzung im Cent-Bereich, aber die Ressourcen
laufen dauerhaft weiter, bis sie explizit geloescht werden.

Sicherheitshinweis: Es wurden root-Account-Credentials des Profils "private"
verwendet (kein separater IAM-User). Fuer produktiven Dauerbetrieb waere ein
IAM-User mit eingeschraenkten Rechten empfehlenswert statt des root-Accounts.

## Frontend erneut aktualisieren (nach Aenderungen an public/)

```bash
aws s3 sync public/ s3://www.steudler-it.com/customer/tanzwertung/ --delete --profile private --region eu-central-1

aws cloudfront create-invalidation \
  --distribution-id ET7I2SRWY3SUN \
  --paths "/customer/tanzwertung/*" \
  --profile private --region eu-central-1
```

`--delete` wirkt hier nur innerhalb des Praefixes `customer/tanzwertung/`,
raeumt also veraltete Dateien in diesem Unterordner auf, ohne die Hauptseite
im selben Bucket zu beruehren. Die Invalidation ist **notwendig, nicht optional**:
CloudFront hat eine eigene Edge-Cache-TTL fuer diese Dateien, ein Sync allein
reicht nicht, um Besuchern sofort die neue Version auszuliefern (das ist beim
allerersten Deploy testweise noch anders aufgefallen).

## Backend erneut deployen (nach Aenderungen an backend/ oder template.yaml)

```bash
aws cloudformation package \
  --template-file template.yaml \
  --s3-bucket tanzwertung-sam-artifacts-435676973415 \
  --output-template-file /tmp/packaged.yaml \
  --region eu-central-1 --profile private

aws cloudformation deploy \
  --template-file /tmp/packaged.yaml \
  --stack-name tanzwertung \
  --capabilities CAPABILITY_IAM \
  --region eu-central-1 --profile private
```

Falls sich dabei die API-URL aendert (z.B. neuer Stack), `public/config.js`
mit dem neuen `ApiUrl`-Output aktualisieren und das Frontend neu hochladen.

## CORS einschraenken (optional, empfohlen)

Aktuell erlaubt `template.yaml` (`Api.Properties.Cors.AllowOrigin`) jeden
Origin (`'*'`). Fuer mehr Sicherheit auf die tatsaechliche Website-Domain
einschraenken und den Stack erneut deployen.

## Alte Version

Die urspruengliche Node/Express/Socket.io-Implementierung (Docker-basiert,
mit echtem WebSocket-Push statt Polling) liegt unveraendert in
`legacy-node-server/` und laesst sich weiterhin lokal mit
`npm start` (in diesem Ordner) betreiben.
