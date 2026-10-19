# Finance Tracker — suivi des dépenses à deux

Application **100 % locale** (localhost, base SQLite sur disque). Aucune donnée ne sort de la machine :
pas de cloud, pas de BaaS, pas d'authentification.

## Stack

| Couche | Choix |
|---|---|
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Style | Tailwind CSS v4, composants UI locaux (style shadcn) |
| Base | SQLite (fichier `prisma/dev.db`) |
| ORM | Prisma 7 + driver adapter `better-sqlite3` |
| Graphiques | Recharts |

## Prérequis

**Node.js 22 LTS** (minimum 20.19). Prisma 7, Tailwind v4 et better-sqlite3 ne
fonctionnent pas sur Node 18.

```bash
node -v            # doit afficher v22.x
```

## Démarrage

```bash
npm install
cp .env.example .env          # DATABASE_URL="file:./prisma/dev.db"
npx prisma migrate deploy     # crée la base à partir de prisma/migrations
npm run db:seed               # 2 utilisateurs + 9 catégories + données d'exemple
npm run dev                   # http://localhost:3010
```

> `npm install` télécharge les moteurs Prisma : une connexion Internet est nécessaire
> **uniquement à cette étape**. Ensuite l'application fonctionne hors ligne.

Pour repartir de zéro : `rm prisma/dev.db && npx prisma migrate deploy && npm run db:seed`.

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | serveur de développement (port 3010) |
| `npm run build` / `npm start` | build et exécution en production locale |
| `npm test` | tests unitaires du moteur de règlement (`node:test`) |
| `npm run db:migrate` | créer/appliquer une migration après modification du schéma |
| `npm run db:seed` | (ré)initialiser utilisateurs, catégories et exemples |
| `npm run db:studio` | explorateur de base Prisma Studio |

## Fonctionnalités

- **Tableau de bord** — total du mois, part partagée, donut par catégorie, courbes revenus/dépenses sur 6 mois, taux d'épargne, solde courant.
- **Dépenses** — CRUD complet, quatre types de répartition, filtres (recherche, catégorie, payeur, répartition) portés par l'URL.
- **Plafonds** — un plafond mensuel par catégorie, barres *bullet* avec repère de **rythme attendu**, statuts et bandeau d'alerte.
- **Revenus** — base récurrente (bourse, APL, aide) + encaissements variables saisis un par un (cours, freelance, primes), avec taux d'épargne du mois.
- **Règle 50/30/20** — comparaison cible / réel à partir du revenu net réel du mois.
- **Récurrentes** — modèles mensuels (loyer, abonnements) et génération **idempotente** du mois.
- **Règlements** — remboursements entre les deux personnes, solde remis à zéro.
- **Sauvegarde** — export du fichier SQLite et des dépenses en CSV (`Paramètres`).

## Modèle de données

- **User** — exactement deux profils, identifiés par un `slot` fixe (`A` / `B`).
  Nom et couleur modifiables dans *Paramètres* ; le `slot` ne change jamais, ce qui
  garantit que l'historique reste cohérent après un renommage.
- **Expense** — intitulé, `amount` (**en centimes**, entier), date, catégorie, `paidById`, `splitType`.
- **ExpenseShare** — la part réellement supportée par chaque utilisateur. Elle est
  **calculée puis stockée** à l'écriture : les soldes se lisent sans réinterpréter les
  règles de partage, et modifier une règle plus tard ne réécrit pas le passé.
- **Settlement** — remboursement effectif d'un utilisateur vers l'autre.
- **RecurringExpense** — modèle mensuel. Une dépense générée garde un `recurringId`,
  ce qui rend la génération idempotente : relancer le même mois ne crée pas de doublon.
  Supprimer un modèle ne supprime pas les dépenses déjà générées (`recurringId` passe à `NULL`).
- **Category.monthlyBudget** — plafond mensuel en centimes, `null` = non suivi.
- **Category.bucket** — `BESOINS` ou `ENVIES` pour la règle 50/30/20.
- **User.baseIncome** — part STABLE du revenu net mensuel (bourse, APL, aide familiale).
- **Income** — un encaissement variable : montant, date, source, utilisateur. La base
  n'y figure jamais, sinon elle serait comptée deux fois.

Tous les montants sont des **entiers de centimes**. Aucun flottant n'est stocké ; la
répartition utilise la méthode du plus grand reste (`allocate`), donc la somme des parts
est toujours exactement égale au montant total, y compris sur les montants impairs.

## Types de répartition

| Type | Effet |
|---|---|
| `PERSONAL_A` / `PERSONAL_B` | la totalité est à la charge de cette personne |
| `SHARED_50_50` | moitié/moitié (le centime restant va au premier) |
| `CUSTOM` | part de A saisie librement, le reste va à B |

## Moteur de règlement

`src/lib/balance.ts` — module pur, sans Prisma ni React :

```
net(u) = Σ dépenses payées par u
       − Σ parts à la charge de u
       + Σ remboursements envoyés par u
       − Σ remboursements reçus par u
```

`net > 0` : on doit de l'argent à `u`. Les transferts sont ensuite calculés par
compensation gloutonne (`minimalTransfers`) — 0 ou 1 transfert pour deux personnes,
et l'algorithme reste correct si un troisième utilisateur est ajouté plus tard.

Couvert par `npm test` (22 tests) : arrondis, dépenses personnelles, répartition
libre, symétrie, effet d'un remboursement, statuts de plafond, progression du mois
(février bissextile inclus), agrégation du revenu et taux d'épargne (déficit inclus),
et cas limites de la règle 50/30/20.

## Plafonds : le statut, et pourquoi le rythme compte

`src/lib/budget.ts` — module pur, testé.

| Statut | Condition | Sens |
|---|---|---|
| `critical` | dépensé > plafond | trop tard |
| `warning` | dépensé > plafond × fraction du mois écoulée | **en avance sur le rythme** |
| `ok` | au rythme ou en dessous | rien à signaler |

Le statut `warning` est le seul qui serve à quelque chose : un plafond qui n'alerte
qu'au moment d'être franchi prévient le 28 du mois, quand il n'y a plus rien à faire.
Le repère vertical sur chaque barre matérialise ce rythme.

Le statut n'est jamais porté par la couleur seule : icône + libellé chiffré
l'accompagnent systématiquement.

## Revenu : base + encaissements

Un revenu étudiant n'est pas constant. Il est donc modélisé en deux morceaux :

```
revenu(mois) = Σ baseIncome des deux utilisateurs      (stable, saisi une fois)
             + Σ Income du mois                        (variable, saisi au fil de l'eau)
```

La base se règle dans *Paramètres*, les encaissements dans *Revenus*. Un mois sans
la moindre écriture (ni dépense ni revenu) est affiché **vide**, pas à 100 %
d'épargne : un mois antérieur au suivi n'est pas un mois exemplaire.

## Règle 50/30/20

Calculée sur le **revenu net réel du mois** (base + encaissements) :

```
besoins = dépenses du mois dans les catégories BESOINS   → cible 50 %
envies  = dépenses du mois dans les catégories ENVIES    → cible 30 %
épargne = revenu − besoins − envies                      → cible 20 %
```

L'épargne est un **reste**, jamais une catégorie de dépense : enregistrer un
virement vers un livret comme une dépense produirait un double comptage.

## Structure

```
prisma/          schéma, migration initiale, seed
src/app/         pages (tableau de bord, dépenses, plafonds, récurrentes, règlements,
                 paramètres), routes d'export + server actions
src/components/  UI et graphiques
src/lib/         money · split · balance · budget · queries · session · palette
```

L'utilisateur actif (sélecteur en haut à droite) est stocké dans un cookie local ;
il ne sert qu'à pré-remplir les formulaires — il ne restreint aucun accès.
