# Projekt: Steudler IT Solutions (eigene Firmenwebsite)

## Kontext

- Kunde: Steudler IT Solutions selbst (KEIN externer Kunde — die
  eigene Firmenwebsite von Jascha)
- Ansprechpartner: Jascha Steudler
- Domain: steudler-it.com (+ www.steudler-it.com) — bereits als Alias
  auf der CloudFront-Distribution eingerichtet (Kauf/DNS bei Aionos,
  manuell verwaltet — NICHT automatisieren)
- Website-Typ: statisch (mehrere HTML-Seiten: index, projekte,
  webseiten, impressum, datenschutz, servicevertrag, notdienst, ...)
- GitHub-Repo: jsSteud/steudler-it-com

## AWS Deploy

Zieltyp: S3+CloudFront

### Falls S3 + CloudFront
- BUCKET_NAME: www.steudler-it.com
- DISTRIBUTION_ID: ET7I2SRWY3SUN
- DISTRIBUTION_DOMAIN: d1b8rbob7bxskj.cloudfront.net
- Build-Output-Ordner: ./ (statische HTML-Dateien, kein Build-Schritt)

## Deploy-Workflow

Dieses Projekt folgt dem globalen `deploy-dual` Skill:
Jede genehmigte Änderung wird IMMER parallel nach GitHub gepusht
UND auf AWS deployed. Kein CI/CD — Claude Code führt beide Schritte
selbst aus. Siehe `~/.claude/skills/deploy-dual/SKILL.md` für Details.

## Sonstiges

- Bucket nutzt S3-Static-Website-Hosting (Origin-Domain in CloudFront
  ist der `.s3-website.eu-central-1.amazonaws.com`-Endpoint, kein OAC)
  — abweichend vom Standard-Muster neuerer Projekte, analog zu
  `olivia-sophe-website`.
- Enthält NICHT nur die Hauptseite: `webseite/demo/` hat separate
  Demo-Unterseiten (pizzeria, nagelstudio, metallbau) als
  Referenzbeispiele auf der eigenen Seite.
- `customer/tanzwertung/` ist ein eigenständiges Unterprojekt mit
  eigenem AWS-SAM-Backend (`template.yaml`) und einem
  `legacy-node-server` — das ist NICHT Teil des Haupt-Deploys dieser
  Website und braucht ggf. eine eigene CLAUDE.md/Deploy-Klärung, falls
  daran gearbeitet wird (ähnlicher Sonderfall wie bei
  `polsterprofi-website`s SAM-Backend — vor einem Deploy dieses
  Unterordners erst mit Jascha klären, nicht einfach über den
  Standard-`deploy-dual`-Befehl laufen lassen).
