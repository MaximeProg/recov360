# Plan Technique — Recov360

> Plateforme de recouvrement automatisé pour PME en Afrique de l'Ouest
> SaaS multi-tenant · FastAPI · Next.js · PostgreSQL

---

## Stack technique

| Couche | Technologie |
|---|---|
| Backend | FastAPI + Python 3.12 |
| Base de données | Neon PostgreSQL (serverless) |
| ORM | SQLAlchemy 2.0 async + Alembic |
| Frontend | Next.js 14 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Auth | JWT (access 15min + refresh 7j) |
| Fichiers | Cloudinary |
| Emails | SMTP configurable (Brevo par défaut) |
| SMS | Gateway SMS configurable |
| Push | Firebase Cloud Messaging (FCM) |
| Queue | Celery + Redis |
| Cache | Redis |
| Docs API | Swagger / OpenAPI |
| Deploy | Docker + Docker Compose |

---

## Architecture du projet

```
recov360/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── redis.py
│   │   │   ├── security.py
│   │   │   └── middleware.py
│   │   ├── domains/
│   │   │   ├── auth/
│   │   │   │   ├── router.py
│   │   │   │   ├── service.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── models.py
│   │   │   ├── companies/
│   │   │   │   ├── router.py
│   │   │   │   ├── service.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── models.py
│   │   │   ├── users/
│   │   │   ├── debtors/
│   │   │   ├── invoices/
│   │   │   ├── notifications/
│   │   │   ├── workflows/
│   │   │   ├── scoring/
│   │   │   └── reports/
│   │   ├── shared/
│   │   │   ├── utils.py
│   │   │   ├── pagination.py
│   │   │   └── base_model.py
│   │   ├── workers/
│   │   │   ├── celery_app.py
│   │   │   ├── tasks_notifications.py
│   │   │   ├── tasks_workflows.py
│   │   │   └── tasks_scoring.py
│   │   └── api/
│   │       └── v1/
│   ├── migrations/
│   └── tests/
│       ├── unit/
│       └── integration/
│
├── frontend/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── reset-password/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── debtors/
│   │   │   ├── invoices/
│   │   │   ├── workflows/
│   │   │   ├── reports/
│   │   │   ├── team/
│   │   │   └── settings/
│   │   └── api/
│   ├── components/
│   │   ├── ui/
│   │   ├── dashboard/
│   │   ├── debtors/
│   │   ├── invoices/
│   │   └── shared/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
│
└── infra/
    ├── docker-compose.yml
    ├── docker-compose.prod.yml
    ├── nginx/
    └── .github/
        └── workflows/
            └── ci.yml
```

---

## Modèle de données

```
Company (tenant)
  ├── Users                  (rôles : admin, comptable, agent, superviseur)
  ├── Debtors
  │     ├── Invoices
  │     │     ├── Payments
  │     │     └── Reminders
  │     ├── PromiseToPay
  │     ├── Documents
  │     └── RiskScore
  ├── MessageTemplates
  ├── WorkflowRules
  ├── Notifications
  └── AuditLogs
```

**Règle multi-tenant** : chaque entité porte un `company_id`. L'isolation est assurée automatiquement par middleware à chaque requête.

---

## Phase 1 — Fondations

### Objectif
Mettre en place l'infrastructure, la base de données, l'authentification et le système multi-tenant.

### Backend
- Init projet FastAPI avec structure DDD
- Configuration Neon PostgreSQL + SQLAlchemy async
- Setup Alembic (migrations)
- Configuration Redis + Celery + Celery Beat
- Middleware multi-tenant (injection automatique `company_id`)
- Système JWT (access token 15min + refresh token 7j)
- RBAC (4 rôles, permissions granulaires par ressource)
- Audit log automatique (middleware global)
- Soft delete global sur toutes les entités

### Infrastructure
- Docker Compose (API + PostgreSQL + Redis + Celery + Flower)
- Gestion des variables d'environnement (.env structuré)
- Logging centralisé (JSON structuré)
- Health check endpoint

---

## Phase 2 — Backend Core

### Module Auth
- Inscription entreprise (onboarding complet)
- Login / Logout
- Refresh token
- Réinitialisation mot de passe par email
- Vérification email

### Module Companies
- CRUD entreprise
- Upload logo via Cloudinary
- Personnalisation branding (couleurs, signature, templates)
- Gestion multi-agences et filiales
- Paramètres SMTP propres à chaque entreprise

### Module Users
- CRUD utilisateurs
- Assignation et modification des rôles
- Invitation par email
- Gestion des permissions par rôle

### Module Debtors
- CRUD débiteurs
- Import en masse CSV / Excel
- Catégorisation et tags personnalisés
- Upload documents clients via Cloudinary
- Notes internes par débiteur
- Historique complet des actions

### Module Invoices et Créances
- CRUD factures
- Statuts : En attente / Partiellement payé / En retard / Soldé / Litige
- Enregistrement de paiements partiels
- Gestion des pénalités et intérêts
- Génération PDF (WeasyPrint)
- Import facture PDF

### Module Notifications et Relances
- Envoi email via SMTP configurable
- Envoi SMS via gateway configurable
- Templates de messages dynamiques avec variables
- Historique complet des envois
- File d'attente Celery pour envois asynchrones
- Retry automatique en cas d'échec

### Module Workflow Automatisé
- Règles configurables par entreprise
- Déclencheurs temporels : J-7, J-3, J-1, J+0, J+3, J+7, J+15, J+30
- 4 niveaux d'escalade (rappel amical → relance formelle → superviseur → juridique)
- Scheduler Celery Beat
- Promesse de paiement : capture, suivi, historique des non-respects

### Module Scoring
- Calcul automatique du score de risque client
- Critères : fréquence retards, montant moyen, historique paiements, promesses non tenues, ancienneté, litiges
- Mise à jour automatique après chaque événement
- Catégories : Faible / Moyen / Élevé / Critique

### Module Rapports
- Rapport créances par période
- Rapport recouvrement par agent
- Rapport clients à risque
- Export PDF / Excel / CSV

### API publique
- Endpoints REST complets et documentés (Swagger / OpenAPI)
- Authentification par API Key
- Rate limiting par clé
- Versioning `/api/v1/`
- Gestion et rotation des clés API

---

## Phase 3 — Frontend

### Pages Auth
- Login
- Inscription + onboarding entreprise (wizard 3 étapes)
- Réinitialisation mot de passe

### Dashboard principal
- KPIs temps réel : total créances, montant récupéré, montant en retard, taux de recouvrement
- Graphiques : courbes d'évolution, histogrammes, répartition des créances
- Top mauvais payeurs
- Alertes et notifications importantes

### Gestion des débiteurs
- Liste avec filtres, recherche et tri
- Fiche débiteur complète (infos, documents, historique, score)
- Import CSV / Excel
- Upload documents

### Gestion des créances et factures
- Liste des créances avec statuts visuels
- Création et édition de facture
- Timeline des paiements
- Actions rapides (relancer, marquer payé, noter)

### Workflows et relances
- Configuration des scénarios de relance par entreprise
- Historique des envois (email, SMS)
- Tableau de bord des promesses de paiement

### Rapports
- Rapports filtrables par période
- Export PDF / Excel / CSV

### Paramètres entreprise
- Profil + branding (logo, couleurs, signature)
- Gestion de l'équipe et des rôles
- Templates de messages personnalisés
- Configuration SMTP
- Gestion des clés API

### Centre de notifications
- Cloche de notifications temps réel
- Intégration Firebase Cloud Messaging (push web)
- Historique des alertes système

---

## Phase 4 — Intelligence artificielle

- Moteur de scoring avancé basé sur l'historique
- Détection d'anomalies (comportements de paiement inhabituels)
- Recommandations de stratégies de recouvrement par client
- Analyse prédictive : probabilité de paiement dans les X jours
- Dashboard IA : insights et alertes prédictives par entreprise

---

## Phase 5 — Sécurité et performance

- Tests de charge (Locust)
- Optimisation requêtes PostgreSQL (index, explain analyze, partitionnement)
- Chiffrement des données sensibles (Fernet)
- Protection XSS / CSRF (headers Next.js + FastAPI)
- Rotation automatique des tokens
- Monitoring erreurs (Sentry)
- Monitoring API (Prometheus + Grafana)
- Tests unitaires backend (pytest)
- Tests intégration (pytest + base de test dédiée)
- Tests frontend (Jest + React Testing Library)

---

## Phase 6 — Déploiement production

- Dockerfile multi-stage (build optimisé)
- Docker Compose production
- Nginx reverse proxy + SSL (Let's Encrypt)
- CI/CD GitHub Actions (lint → tests → build → deploy)
- Gestion des secrets (variables d'environnement sécurisées)
- Backup automatique PostgreSQL
- Health checks sur tous les services
- Configuration domaine + DNS

---

## Canaux de communication supportés

| Canal | Statut |
|---|---|
| Email (SMTP) | Intégré |
| SMS (gateway) | Intégré |
| Notifications push (FCM) | Intégré |
| Notifications navigateur | Intégré |

---

## Sécurité

| Mesure | Détail |
|---|---|
| Authentification | JWT access + refresh |
| Autorisation | RBAC granulaire par rôle |
| Isolation données | Multi-tenant strict par `company_id` |
| Chiffrement | Données sensibles chiffrées (Fernet) |
| Traçabilité | Audit log complet sur toutes les actions |
| Protection | XSS, CSRF, SQL injection |
| Rate limiting | Par endpoint et par clé API |
| Tokens | Rotation automatique |

---

## Rôles utilisateurs

| Rôle | Accès |
|---|---|
| Administrateur | Accès complet à toutes les fonctionnalités |
| Comptable | Créances, factures, rapports, exports |
| Agent de recouvrement | Débiteurs, relances, promesses de paiement |
| Superviseur | Lecture globale, escalades, rapports d'équipe |
