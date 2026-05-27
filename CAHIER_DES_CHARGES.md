# Recov360 — Cahier des charges fonctionnel et technique

**Version :** 1.0  
**Date :** Mai 2026  
**Statut :** Plateforme opérationnelle  
**Contact :** kakpokouassimaxime80@gmail.com

---

## 1. Présentation générale

### 1.1 Qu'est-ce que Recov360 ?

Recov360 est une **plateforme SaaS de recouvrement de créances** destinée aux PME africaines. Elle permet à une entreprise de gérer l'ensemble de son cycle de recouvrement : de l'enregistrement d'une créance jusqu'à son encaissement, en passant par les relances automatiques, le suivi des débiteurs et l'analyse financière.

La plateforme est accessible via un navigateur web, aussi bien sur ordinateur que sur téléphone mobile.

### 1.2 Problème résolu

Les PME africaines perdent chaque année des sommes importantes faute d'un suivi rigoureux de leurs créances. Les relances sont manuelles, irrégulières et non traçables. Il n'existe pas de vision centralisée du risque clients. Recov360 automatise et professionnalise ce processus.

### 1.3 Modèle économique

Recov360 est une plateforme **multi-entreprises (multi-tenant)**. Chaque entreprise souscrit à un abonnement et dispose de son propre espace de données, complètement isolé de celui des autres.

L'opérateur de la plateforme (l'équipe Recov360) administre l'ensemble via une interface d'administration séparée, inaccessible aux entreprises clientes.

---

## 2. Architecture générale

### 2.1 Deux espaces distincts et étanches

```
┌─────────────────────────────────────────────┐
│          ESPACE ENTREPRISE CLIENTE           │
│                                             │
│  Chaque entreprise a son propre espace :    │
│  débiteurs, créances, équipe, rapports…     │
│  Les données sont 100 % isolées.            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│        ESPACE OPÉRATEUR RECOV360            │
│                                             │
│  Interface séparée, URL confidentielle.     │
│  Vision globale de toutes les entreprises.  │
│  Gestion des plans et abonnements.          │
└─────────────────────────────────────────────┘
```

Ces deux espaces ne se mélangent pas. Un administrateur d'une entreprise cliente ne voit jamais les données d'une autre entreprise, et n'a aucun accès à l'espace opérateur.

### 2.2 Stack technique

| Composant | Technologie |
|---|---|
| Backend API | Python 3.12 — FastAPI (asynchrone) |
| Base de données | PostgreSQL (Neon cloud) — SQLAlchemy async |
| Frontend | Next.js 16 — React 19 — TypeScript |
| Style | CSS variables — design system propriétaire |
| Authentification | JWT (access token 15 min + refresh token 7 jours) |
| Stockage fichiers | Cloudinary (logos, preuves de paiement) |
| Emails | SMTP configurable |
| SMS | Passerelle SMS configurable |
| Notifications push | Firebase Cloud Messaging |
| Cache / files | Redis + Celery |
| Monitoring erreurs | Sentry |

---

## 3. Espace entreprise cliente

### 3.1 Inscription et connexion

- **Inscription en 3 étapes** : nom de l'entreprise → informations du compte administrateur → confirmation
- Connexion par email + mot de passe
- Tokens JWT avec renouvellement automatique (refresh silencieux)
- Déconnexion sécurisée (invalidation du refresh token)
- Réinitialisation de mot de passe par email

### 3.2 Rôles et permissions

Chaque entreprise gère sa propre équipe avec 4 niveaux de rôle :

#### Administrateur (`admin`)
Accès complet à toutes les fonctionnalités de l'entreprise.
- Gestion des débiteurs (créer, modifier, supprimer)
- Gestion des créances (créer, modifier, supprimer)
- Enregistrement des paiements
- Envoi de relances
- Configuration des workflows et templates
- Calcul et consultation des scores de risque
- Accès aux rapports complets et exports
- Gestion de l'équipe (inviter, supprimer des membres)
- Configuration de l'entreprise (informations, logo, couleurs)
- Modification du mot de passe

#### Superviseur (`superviseur`)
Supervision opérationnelle, sans accès aux paramètres de l'entreprise.
- Création et modification des débiteurs
- Création et modification des créances
- Enregistrement des paiements
- Envoi de relances
- Accès aux workflows et scoring
- Accès aux rapports complets
- Consultation de l'équipe (sans pouvoir la gérer)

#### Comptable (`comptable`)
Focalisé sur le volet financier.
- Consultation des débiteurs
- Consultation des créances
- **Enregistrement des paiements**
- Accès aux rapports et exports financiers
- Pas d'accès aux workflows, scoring, ni gestion de l'équipe

#### Agent (`agent`)
Terrain, contact client.
- Consultation des débiteurs
- Consultation des créances
- **Envoi de relances**
- Ajout de notes sur les débiteurs
- Pas d'accès aux rapports, workflows, scoring, ni gestion de l'équipe

---

### 3.3 Modules fonctionnels

#### 3.3.1 Tableau de bord

Page d'accueil après connexion. Synthèse visuelle de l'activité :

- **4 indicateurs clés** : total des créances, montant recouvré, montant en retard, taux de recouvrement global
- **Graphique d'évolution mensuelle** (area chart) : créances émises vs montants recouvrés sur les derniers mois
- **Répartition par statut** (pie chart) : en attente / partiel / en retard / soldé / litige
- **Liste des créances en retard** les plus récentes avec lien direct
- **Top débiteurs à risque** : les 5 débiteurs avec le score de risque le plus élevé

---

#### 3.3.2 Gestion des débiteurs

Un débiteur est une personne physique ou morale qui doit de l'argent à l'entreprise.

**Fiche débiteur contient :**
- Nom, téléphone, email, adresse, ville
- Catégorie : particulier, entreprise, administration
- Score de risque (0–100) et niveau (faible / moyen / élevé / critique)
- Montant total dû et montant total payé
- Taux de recouvrement (calculé côté serveur)
- Tags libres
- Photo et document d'identité (upload Cloudinary)
- Notes internes horodatées

**Fonctionnalités :**
- Liste paginée avec recherche textuelle
- Filtrage par catégorie et niveau de risque
- Page de détail avec 3 onglets : aperçu / créances liées / notes
- Ajout de notes directement depuis la fiche
- Envoi de relance depuis la fiche
- Suppression logique (soft delete — données conservées)

---

#### 3.3.3 Gestion des créances (factures)

Une créance est une facture impayée liée à un débiteur.

**Une créance contient :**
- Numéro de facture (auto-généré ou manuel)
- Débiteur associé
- Montant principal et devise (XOF, XAF, EUR, USD…)
- Date d'échéance
- Taux de pénalité mensuel (calculé automatiquement)
- Statut : en attente / partiellement payé / en retard / soldé / litige
- Niveau de relance atteint (1, 2, 3…)
- Description et notes

**Statuts et transitions :**
```
en_attente → partiellement_paye → solde
           → en_retard          → solde
                                → litige
```

**Fonctionnalités :**
- Liste paginée avec filtres par statut et recherche
- Barre de résumé financier (total / payé / restant)
- Page de détail avec progression visuelle du recouvrement
- Création de créance avec calcul automatique des pénalités
- Enregistrement de paiements multiples (espèces, virement, chèque, mobile money)
- Historique complet des paiements avec date, mode et référence
- Upload de preuve de paiement (Cloudinary)
- Envoi de relance depuis la page de détail
- Alerte visuelle pour les créances en retard

---

#### 3.3.4 Workflows et relances automatiques

Système de relance configurable par l'entreprise.

**Règles de workflow :**
- Déclenchement basé sur le nombre de jours après échéance (ex : J+7, J+30, J+60)
- Canal de relance : Email ou SMS
- Niveau d'escalade : 1 (relance douce), 2 (mise en demeure), 3 (escalade juridique)
- Activation / désactivation par règle

**Templates de messages :**
- Personnalisables par canal (email ou SMS)
- Variables dynamiques disponibles : `{{debtor_name}}`, `{{invoice_number}}`, `{{amount_due}}`, `{{due_date}}`, `{{company_name}}`
- Bibliothèque de templates par entreprise

**Promesses de paiement :**
- Enregistrement d'une promesse de paiement d'un débiteur
- Date prévue et montant promis
- Suivi du statut : en attente / tenu / non tenu
- Alerte automatique si la promesse n'est pas honorée à date

---

#### 3.3.5 Scoring des débiteurs

Chaque débiteur reçoit un **score de risque de 0 à 100** calculé par l'algorithme Recov360.

**Calcul du score (côté serveur) :**

| Facteur | Poids max |
|---|---|
| Ratio factures en retard / total factures | 40 points |
| Ratio promesses non tenues / total promesses | 25 points |
| Délai moyen de retard (> 7j, > 15j, > 30j) | 20 points |
| Montant total dû (seuils 1M et 5M XOF) | 10 points |
| Relances échouées (× 2, max 5) | 5 points |

**Niveaux de risque :**
- **Faible** : 0–29 (recouvrement normal)
- **Moyen** : 30–54 (surveillance recommandée)
- **Élevé** : 55–79 (action urgente)
- **Critique** : 80–100 (alerte — notification automatique envoyée)

**Fonctionnalités :**
- Tableau de classement par risque décroissant (top 50)
- Résumé par niveau (nombre de débiteurs par catégorie)
- Barre de progression visuelle du score
- Taux de paiement par débiteur (calculé serveur)
- Recalcul global déclenché manuellement ou automatiquement
- Notification push / alerte lorsqu'un débiteur passe en niveau critique

---

#### 3.3.6 Rapports et analytics

**Indicateurs clés (KPIs) :**
- Total des créances émises
- Total recouvré
- Total en retard
- Taux de recouvrement global (%)
- Nombre total de débiteurs
- Nombre total de factures

**Répartition par statut :**
- Nombre et montant par statut (en attente, partiel, retard, soldé, litige)

**Graphiques :**
- Évolution mensuelle : créances émises vs recouvrées (area chart)
- Comparaison mensuelle en barres (bar chart)

**Performance par agent :**
- Nombre de factures gérées par agent
- Montant recouvré par agent

**Exports :**
- Export CSV de toutes les créances
- Export Excel (.xlsx) de toutes les créances

---

#### 3.3.7 Notifications

Centre de notifications en temps réel.

**Types d'alertes générées automatiquement :**
- Nouvelle créance enregistrée
- Paiement reçu
- Créance en retard important
- Relance envoyée
- Promesse de paiement non tenue
- Escalade de dossier
- Échec d'envoi de relance
- Débiteur passé en score critique

**Fonctionnalités :**
- Liste paginée de toutes les notifications
- Badge de notifications non lues dans le menu
- Marquage lu individuel ou global
- Lien direct vers l'entité concernée (débiteur ou créance)
- Icône et couleur selon le type d'alerte

---

#### 3.3.8 Gestion de l'équipe

*Accessible aux administrateurs et superviseurs.*

- Liste des membres avec nom, email, téléphone, rôle et statut actif/inactif
- Invitation d'un nouveau membre (email, prénom, nom, rôle, mot de passe temporaire)
- Suppression d'un membre
- Indicateur visuel du statut (actif / inactif)

---

#### 3.3.9 Paramètres de l'entreprise

*Accessible à l'administrateur uniquement.*

**Onglet Entreprise :**
- Nom de l'entreprise
- Téléphone et ville
- Adresse complète
- Secteur d'activité
- Affichage du plan actuel (starter / pro / enterprise)

**Onglet Apparence :**
- Couleur principale et couleur secondaire (sélecteur de couleur)
- Signature email personnalisée
- Logo de l'entreprise (upload — affiché dans la sidebar)

**Onglet Sécurité :**
- Changement de mot de passe (vérification du mot de passe actuel requis)

---

#### 3.3.10 Profil utilisateur

Chaque membre peut accéder à son profil personnel :
- Affichage de ses informations (nom, email, rôle)
- Changement de mot de passe

---

### 3.4 Interface utilisateur

**Thèmes :**
- Mode clair et mode sombre — bascule en un clic, préférence sauvegardée
- Couleur principale : bleu `#2563EB`

**Navigation desktop :**
- Sidebar verticale à gauche (260 px)
- Réductible en mode icônes uniquement (68 px) — préférence sauvegardée
- Logo de l'entreprise affiché si configuré

**Navigation mobile :**
- Barre de navigation en bas de l'écran (bottom navigation)
- Menu en drawer depuis un bouton hamburger
- Interface adaptée tablette et smartphone

**Expérience utilisateur :**
- Squelettes de chargement (skeleton screens)
- Notifications toast (succès / erreur) auto-disparaissantes
- Modales centrées avec contenu scrollable
- Pagination intelligente
- Recherche avec délai anti-rebond (debounce 300 ms)
- Animations de transition fluides

---

## 4. Espace opérateur Recov360

Cet espace est **totalement distinct** de l'espace entreprise. Il est accessible uniquement par l'équipe Recov360 via une URL confidentielle. Aucun utilisateur d'une entreprise cliente ne peut y accéder, même avec le rôle "administrateur".

### 4.1 Accès

- URL confidentielle (non référencée, non affichée dans l'interface entreprise)
- Contrôle d'accès par liste blanche d'emails configurée côté serveur
- Redirection automatique vers l'espace entreprise si accès non autorisé
- Interface visuellement distincte (sidebar rouge, bandeau d'avertissement)

### 4.2 Fonctionnalités

**Vue globale (tableau de bord plateforme) :**
- Nombre total d'entreprises clientes
- Nombre d'entreprises actives
- Nombre total d'utilisateurs sur la plateforme
- Volume total des créances gérées

**Gestion des entreprises :**
- Liste de toutes les entreprises avec leur plan actuel et statut
- Changement de plan en un clic (starter → pro → enterprise)

**Audit logs :**
- Historique de toutes les actions effectuées sur la plateforme
- Action, entité concernée, description, adresse IP, horodatage

---

## 5. Sécurité

| Mesure | Détail |
|---|---|
| Authentification | JWT — access token 15 min, refresh token 7 jours |
| Isolation des données | Chaque requête filtre par `company_id` — aucune donnée cross-tenant possible |
| Mots de passe | Hashés (bcrypt) |
| Suppression des données | Soft delete — les données sont marquées supprimées, jamais effacées physiquement |
| Accès super admin | Liste blanche d'emails côté serveur — non modifiable depuis l'interface |
| HTTPS | Obligatoire en production |
| Tokens | Invalidation à la déconnexion |

---

## 6. Plans tarifaires

La gestion des plans est effectuée par l'opérateur depuis l'espace administrateur.

| Plan | Positionnement |
|---|---|
| **Starter** | PME débutante, fonctionnalités essentielles |
| **Pro** | PME en croissance, toutes les fonctionnalités |
| **Enterprise** | Grande structure, accompagnement dédié |

Les limites par plan (nombre d'utilisateurs, de débiteurs, d'exports…) sont définies par l'opérateur.

---

## 7. API

L'ensemble des fonctionnalités est exposé via une **API REST** documentée automatiquement.

- **Base URL :** `https://[domaine]/api/v1`
- **Documentation interactive :** `/docs` (Swagger UI)
- **Authentification :** Bearer token JWT dans le header `Authorization`
- **Format :** JSON

### Principaux endpoints

| Domaine | Préfixe |
|---|---|
| Authentification | `/auth` |
| Entreprise | `/companies` |
| Utilisateurs | `/users` |
| Débiteurs | `/debtors` |
| Créances & paiements | `/invoices` |
| Workflows & templates | `/workflows` |
| Scoring | `/scoring` |
| Rapports & exports | `/reports` |
| Notifications | `/notifications` |
| Administration plateforme | `/superadmin` |

---

## 8. Déploiement

| Composant | Infrastructure recommandée |
|---|---|
| Backend API | Serveur VPS ou cloud (Docker) |
| Base de données | Neon PostgreSQL (cloud serverless) ou PostgreSQL auto-hébergé |
| Frontend | Vercel (déploiement Next.js natif) ou serveur Node |
| Fichiers | Cloudinary |
| Emails | SMTP (Gmail, SendGrid, Mailgun…) |
| SMS | Passerelle SMS locale ou internationale |
| Notifications push | Firebase Cloud Messaging |

---

## 9. Glossaire

| Terme | Définition |
|---|---|
| **Débiteur** | Personne ou société qui doit de l'argent à l'entreprise cliente |
| **Créance** | Facture impayée d'un débiteur |
| **Recouvrement** | Processus de récupération des créances impayées |
| **Workflow** | Séquence automatique de relances déclenchée selon des règles |
| **Score de risque** | Note de 0 à 100 indiquant la probabilité de non-paiement d'un débiteur |
| **Soft delete** | Suppression logique — la donnée est conservée mais masquée |
| **Multi-tenant** | Architecture où plusieurs entreprises partagent la même plateforme avec des données isolées |
| **Token JWT** | Jeton d'authentification sécurisé à durée de vie limitée |
| **SaaS** | Software as a Service — logiciel accessible en ligne par abonnement |

---

*Document généré automatiquement à partir du code source de la plateforme Recov360.*  
*Toute reproduction ou diffusion à des tiers doit être autorisée par l'équipe Recov360.*
