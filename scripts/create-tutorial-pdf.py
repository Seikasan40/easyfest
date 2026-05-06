# -*- coding: utf-8 -*-
"""
Génère le tutoriel admin EasyFest en PDF.
Usage: python scripts/create-tutorial-pdf.py
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib import colors

# ── Couleurs EasyFest ────────────────────────────────────────────────────────
VERT_FORET  = HexColor("#1A3828")
VERT_MOYEN  = HexColor("#2D5A3D")
OR_CHAUD    = HexColor("#C49A2C")
CREME       = HexColor("#F8F4EC")
ENCRE       = HexColor("#2C2416")
MUTED       = HexColor("#7A7060")
ROUGE       = HexColor("#EF4444")
VERT_OK     = HexColor("#10B981")
BLEU_INFO   = HexColor("#3B82F6")
GRIS_CLAIR  = HexColor("#F3F0E8")

W, H = A4

OUTPUT = os.path.join(os.path.dirname(__file__), "..", "EasyFest_Guide_Admin.pdf")

# ── Styles ────────────────────────────────────────────────────────────────────
styles = getSampleStyleSheet()

def s(name, **kw):
    return ParagraphStyle(name, **kw)

TITRE_PAGE = s("TitrePage",
    fontName="Helvetica-Bold", fontSize=28, textColor=white,
    leading=34, spaceAfter=6, alignment=TA_CENTER)

SOUS_TITRE_PAGE = s("SousTitrePage",
    fontName="Helvetica", fontSize=13, textColor=HexColor("#D4E8DB"),
    leading=18, alignment=TA_CENTER)

SECTION_NUM = s("SectionNum",
    fontName="Helvetica-Bold", fontSize=10, textColor=OR_CHAUD,
    leading=14, spaceAfter=2, spaceBefore=20)

SECTION_TITRE = s("SectionTitre",
    fontName="Helvetica-Bold", fontSize=18, textColor=VERT_FORET,
    leading=22, spaceAfter=8)

H2 = s("H2",
    fontName="Helvetica-Bold", fontSize=13, textColor=VERT_FORET,
    leading=17, spaceBefore=14, spaceAfter=6)

H3 = s("H3",
    fontName="Helvetica-Bold", fontSize=11, textColor=VERT_MOYEN,
    leading=15, spaceBefore=10, spaceAfter=4)

BODY = s("Body",
    fontName="Helvetica", fontSize=10, textColor=ENCRE,
    leading=15, spaceAfter=6, alignment=TA_JUSTIFY)

BODY_L = s("BodyL",
    fontName="Helvetica", fontSize=10, textColor=ENCRE,
    leading=15, spaceAfter=4)

STEP_NUM = s("StepNum",
    fontName="Helvetica-Bold", fontSize=11, textColor=white,
    leading=14, alignment=TA_CENTER)

STEP_TEXT = s("StepText",
    fontName="Helvetica", fontSize=10, textColor=ENCRE,
    leading=14, spaceAfter=2)

STEP_BOLD = s("StepBold",
    fontName="Helvetica-Bold", fontSize=10, textColor=ENCRE,
    leading=14, spaceAfter=2)

CODE_STYLE = s("Code",
    fontName="Courier", fontSize=9, textColor=VERT_FORET,
    leading=13, spaceAfter=2, leftIndent=8)

NOTE = s("Note",
    fontName="Helvetica-Oblique", fontSize=9, textColor=MUTED,
    leading=13, spaceAfter=4, leftIndent=8)

WARN = s("Warn",
    fontName="Helvetica-Bold", fontSize=9, textColor=HexColor("#92400E"),
    leading=13, spaceAfter=4)

OK = s("OK",
    fontName="Helvetica-Bold", fontSize=9, textColor=HexColor("#065F46"),
    leading=13, spaceAfter=4)


# ── Helpers ───────────────────────────────────────────────────────────────────
def hr(color=VERT_FORET, thickness=0.5, opacity=0.15):
    return HRFlowable(width="100%", thickness=thickness,
                      color=color, spaceAfter=10, spaceBefore=4)

def step_box(num, title, desc):
    """Crée une ligne d'étape numérotée avec titre + description."""
    tbl = Table([
        [Paragraph(str(num), STEP_NUM),
         [Paragraph(title, STEP_BOLD), Paragraph(desc, STEP_TEXT)]]
    ], colWidths=[1.0*cm, None])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (0, 0), VERT_FORET),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",   (0, 0), (0, 0), 0),
        ("RIGHTPADDING",  (0, 0), (0, 0), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROWBACKGROUNDS",(0, 0), (-1, -1), [GRIS_CLAIR]),
        ("ROUNDEDCORNERS",(0, 0), (-1, -1), [4]),
    ]))
    return KeepTogether([tbl, Spacer(1, 4)])

def info_box(text, color=BLEU_INFO, bg=HexColor("#EFF6FF")):
    tbl = Table([[Paragraph(text, s("IB",
        fontName="Helvetica", fontSize=9, textColor=color, leading=13))
    ]], colWidths=[W - 4*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), bg),
        ("LEFTPADDING",  (0,0),(-1,-1), 10),
        ("RIGHTPADDING", (0,0),(-1,-1), 10),
        ("TOPPADDING",   (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("ROUNDEDCORNERS",(0,0),(-1,-1), [6]),
    ]))
    return KeepTogether([tbl, Spacer(1, 8)])

def warn_box(text):
    return info_box("⚠️  " + text, HexColor("#92400E"), HexColor("#FFFBEB"))

def ok_box(text):
    return info_box("✅  " + text, HexColor("#065F46"), HexColor("#F0FDF4"))

def section_header(num, emoji, title):
    bg_tbl = Table([[
        Paragraph(f"SECTION {num}", s("SN",
            fontName="Helvetica-Bold", fontSize=9, textColor=OR_CHAUD, leading=12)),
        Paragraph(f"{emoji}  {title}", s("ST",
            fontName="Helvetica-Bold", fontSize=16, textColor=white, leading=20)),
    ]], colWidths=[3*cm, None])
    bg_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0),(-1,-1), VERT_FORET),
        ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
        ("LEFTPADDING",   (0,0),(-1,-1), 14),
        ("TOPPADDING",    (0,0),(-1,-1), 12),
        ("BOTTOMPADDING", (0,0),(-1,-1), 12),
        ("SPAN",          (0,0),(0,0)),
    ]))
    return KeepTogether([bg_tbl, Spacer(1, 12)])


# ── Callbacks page ────────────────────────────────────────────────────────────
PAGE_NUM = [0]

def on_page(canvas, doc):
    PAGE_NUM[0] = doc.page
    canvas.saveState()
    # Bande basse
    canvas.setFillColor(VERT_FORET)
    canvas.rect(0, 0, W, 1.0*cm, fill=1, stroke=0)
    canvas.setFillColor(white)
    canvas.setFont("Helvetica", 8)
    canvas.drawCentredString(W/2, 3*mm, f"EasyFest — Guide Admin Confidentiel — Page {doc.page}")
    canvas.restoreState()

def on_first_page(canvas, doc):
    canvas.saveState()
    # Background vert plein sur la première page
    canvas.setFillColor(VERT_FORET)
    canvas.rect(0, 0, W, H, fill=1, stroke=0)
    # Motif décoratif
    canvas.setFillColor(VERT_MOYEN)
    canvas.setStrokeColor(HexColor("#3B6B4A"))
    canvas.setLineWidth(0.5)
    for i in range(0, int(W) + 40, 40):
        canvas.line(i, 0, i - 60, H)
    canvas.restoreState()
    on_page(canvas, doc)


# ── Contenu ───────────────────────────────────────────────────────────────────
def build_content():
    story = []

    # ── PAGE DE GARDE ─────────────────────────────────────────────────────────
    story.append(Spacer(1, 4*cm))
    story.append(Paragraph("EasyFest", s("EF",
        fontName="Helvetica-Bold", fontSize=42, textColor=OR_CHAUD,
        leading=48, alignment=TA_CENTER)))
    story.append(Spacer(1, 0.3*cm))
    story.append(Paragraph("Guide Administrateur", TITRE_PAGE))
    story.append(Spacer(1, 0.5*cm))
    story.append(Paragraph(
        "Comment modifier les textes, ajouter un événement,\n"
        "gérer les bénévoles et modifier des données directement",
        SOUS_TITRE_PAGE))
    story.append(Spacer(1, 2*cm))

    # Badge version
    badge = Table([[Paragraph("Version 1.0 — Mai 2026 — Usage interne", s("B",
        fontName="Helvetica", fontSize=9, textColor=VERT_FORET, leading=13,
        alignment=TA_CENTER))]], colWidths=[10*cm])
    badge.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), OR_CHAUD),
        ("ALIGN",        (0,0),(-1,-1), "CENTER"),
        ("LEFTPADDING",  (0,0),(-1,-1), 16),
        ("RIGHTPADDING", (0,0),(-1,-1), 16),
        ("TOPPADDING",   (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("ROUNDEDCORNERS",(0,0),(-1,-1), [8]),
    ]))
    story.append(Table([[badge]], colWidths=[W - 4*cm]))
    story.append(Spacer(1, 2*cm))
    story.append(Paragraph(
        "Ce document est confidentiel. Il est destiné aux administrateurs\n"
        "et organisateurs autorisés de l'événement.",
        s("Conf", fontName="Helvetica-Oblique", fontSize=9,
          textColor=HexColor("#A3B5A5"), leading=13, alignment=TA_CENTER)))

    story.append(PageBreak())

    # ── SOMMAIRE ──────────────────────────────────────────────────────────────
    story.append(Paragraph("Sommaire", s("Som",
        fontName="Helvetica-Bold", fontSize=22, textColor=VERT_FORET,
        leading=28, spaceAfter=16)))
    hr()
    toc_data = [
        ("1", "🌐", "Accéder aux outils d'administration", "3"),
        ("2", "✏️",  "Modifier un texte sur la page d'accueil", "4"),
        ("3", "🎪", "Ajouter un festival dans la base de données", "6"),
        ("4", "🗑️",  "Supprimer ou révoquer quelqu'un", "9"),
        ("5", "🔧", "Modifications directes dans Supabase", "11"),
        ("6", "🛟", "Safer Space — Gestion des médiateurs", "13"),
        ("7", "🎭", "Changer le rôle d'un bénévole", "14"),
        ("8", "⚡", "Aide-mémoire rapide", "15"),
    ]
    for num, emoji, title, page in toc_data:
        row = Table([[
            Paragraph(f"{num}", s("TN",
                fontName="Helvetica-Bold", fontSize=11, textColor=OR_CHAUD, leading=15)),
            Paragraph(f"{emoji}  {title}", s("TT",
                fontName="Helvetica", fontSize=11, textColor=ENCRE, leading=15)),
            Paragraph(page, s("TP",
                fontName="Helvetica", fontSize=10, textColor=MUTED, leading=15,
                alignment=TA_CENTER)),
        ]], colWidths=[0.8*cm, None, 1.2*cm])
        row.setStyle(TableStyle([
            ("VALIGN",        (0,0),(-1,-1), "MIDDLE"),
            ("TOPPADDING",    (0,0),(-1,-1), 7),
            ("BOTTOMPADDING", (0,0),(-1,-1), 7),
            ("LINEBELOW",     (0,0),(-1,-1), 0.5, GRIS_CLAIR),
        ]))
        story.append(row)
    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 1 — Outils d'administration
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(section_header("1", "🌐", "Accéder aux outils d'administration"))
    story.append(Paragraph(
        "Pour gérer EasyFest, deux outils principaux sont disponibles. "
        "Vous n'avez besoin d'aucune compétence technique — "
        "tout se fait via un navigateur web.",
        BODY))
    story.append(Spacer(1, 8))

    tools = [
        ["Outil", "Adresse", "Pour quoi faire"],
        ["GitHub\n(éditeur de code)", "github.com/Easyfest/easyfest",
         "Modifier les textes visibles\n(page d'accueil, slogan, étiquettes)"],
        ["Supabase\n(base de données)", "supabase.com",
         "Ajouter/supprimer des données\n(événements, bénévoles, organisations)"],
        ["Régie EasyFest\n(interface app)", "easyfest.app/regie/…",
         "Gérer candidatures, rôles,\nplanning au quotidien"],
    ]
    t = Table(tools, colWidths=[3.5*cm, 5.5*cm, None])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), VERT_FORET),
        ("TEXTCOLOR",     (0, 0), (-1, 0), white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("LEADING",       (0, 0), (-1, -1), 13),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, GRIS_CLAIR]),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#E5DDD0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Connexion à Supabase", H2))
    for step in [
        ("1", "Aller sur supabase.com", "Cliquez sur « Sign In » en haut à droite."),
        ("2", "Se connecter", "Utilisez le compte Google ou email associé au projet."),
        ("3", "Sélectionner le projet", "Cliquez sur « easyfest » dans la liste des projets."),
        ("4", "Naviguer", "Menu gauche : « Table Editor » pour voir et modifier les données."),
    ]:
        story.append(step_box(*step))

    story.append(ok_box("URL directe du projet : https://supabase.com/dashboard/project/wsmehckdgnpbzwjvotro"))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 2 — Modifier un texte sur la page d'accueil
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(section_header("2", "✏️", "Modifier un texte sur la page d'accueil"))
    story.append(Paragraph(
        "Les textes de la page d'accueil (slogan, descriptions, étiquettes) "
        "sont dans des fichiers de code sur GitHub. La modification prend "
        "moins de 5 minutes et se fait directement dans le navigateur.",
        BODY))

    story.append(Paragraph("Exemple : Modifier « Le festival pro, sans le prix pro »", H2))
    story.append(info_box(
        "📁  Fichier concerné : apps/vitrine/components/site-header.tsx  —  ligne ~82",
        BLEU_INFO, HexColor("#EFF6FF")))

    for step in [
        ("1", "Aller sur GitHub",
         "Ouvrez github.com/Easyfest/easyfest dans votre navigateur."),
        ("2", "Naviguer jusqu'au fichier",
         "Cliquez sur : apps → vitrine → components → site-header.tsx"),
        ("3", "Ouvrir l'éditeur",
         "Cliquez sur le crayon ✏️ en haut à droite du fichier (icône « Edit this file »)."),
        ("4", "Trouver le texte",
         "Utilisez Ctrl+F (ou Cmd+F sur Mac) pour rechercher le texte exact à modifier. "
         "Par exemple : « Le festival pro, sans le prix pro »"),
        ("5", "Modifier",
         "Remplacez le texte par votre nouvelle version. "
         "Ne modifiez que le texte, pas les balises comme <p> ou className=..."),
        ("6", "Sauvegarder",
         "Faites défiler jusqu'en bas de la page. Dans la section « Commit changes », "
         "laissez le message par défaut ou écrivez ce que vous avez changé. "
         "Cliquez sur « Commit changes » en vert."),
        ("7", "Attendre le déploiement",
         "Dans 2 à 5 minutes, le site se met à jour automatiquement. "
         "Actualisez easyfest.app pour voir le résultat."),
    ]:
        story.append(step_box(*step))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Autres textes courants à modifier", H2))

    texts_table = [
        ["Ce que vous voulez changer", "Fichier à modifier"],
        ["Slogan principal / description",       "apps/vitrine/components/site-header.tsx"],
        ["Page d'accueil (hero, sections)",      "apps/vitrine/app/page.tsx"],
        ["Titre onglet navigateur",              "apps/vitrine/app/layout.tsx"],
        ["Texte page Tarifs",                    "apps/vitrine/app/pricing/page.tsx"],
        ["Texte mentions légales / CGU",         "apps/vitrine/app/legal/"],
    ]
    t2 = Table(texts_table, colWidths=[7*cm, None])
    t2.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), VERT_MOYEN),
        ("TEXTCOLOR",     (0, 0), (-1, 0), white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("LEADING",       (0, 0), (-1, -1), 13),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, GRIS_CLAIR]),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#E5DDD0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t2)
    story.append(warn_box(
        "Ne modifiez jamais les lignes qui commencent par import, export, "
        "className, style, ou qui contiennent des accolades { }. "
        "Ne modifiez que le texte entre les balises."))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 3 — Ajouter un festival
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(section_header("3", "🎪", "Ajouter un festival dans la base de données"))
    story.append(Paragraph(
        "Pour créer un nouvel événement dans EasyFest, il faut créer deux entrées "
        "dans Supabase : l'organisation (l'association) et l'événement. "
        "Si l'organisation existe déjà, passez directement à l'étape Événement.",
        BODY))

    story.append(Paragraph("Étape A — Créer l'organisation (association)", H2))
    story.append(info_box(
        "📌  Table Supabase : organizations   —   À créer si c'est une nouvelle association",
        BLEU_INFO, HexColor("#EFF6FF")))

    for step in [
        ("1", "Ouvrir Supabase → Table Editor",
         "Dans le menu gauche, cliquez sur « Table Editor ». "
         "Cherchez la table « organizations »."),
        ("2", "Insérer une nouvelle ligne",
         "Cliquez sur « Insert row » (bouton vert en haut à droite)."),
        ("3", "Remplir les champs",
         "Voir le tableau des champs ci-dessous."),
        ("4", "Sauvegarder",
         "Cliquez sur « Save » ou appuyez sur Entrée."),
    ]:
        story.append(step_box(*step))

    org_fields = [
        ["Champ", "Exemple", "Description"],
        ["name",       "Les Amis du Lac",      "Nom de l'association (affiché)"],
        ["slug",       "amis-du-lac",           "Identifiant URL : minuscules, tirets, sans espace"],
        ["description","Festival de jazz...",   "Description courte (optionnel)"],
        ["country",    "FR",                    "Code pays (laisser FR)"],
        ["is_active",  "true",                  "Mettre true pour activer"],
    ]
    t3 = Table(org_fields, colWidths=[3.5*cm, 4*cm, None])
    t3.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), VERT_FORET),
        ("TEXTCOLOR",     (0, 0), (-1, 0), white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("LEADING",       (0, 0), (-1, -1), 13),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, GRIS_CLAIR]),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#E5DDD0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t3)
    story.append(Spacer(1, 12))

    story.append(Paragraph("Étape B — Créer l'événement", H2))
    story.append(info_box("📌  Table Supabase : events", BLEU_INFO, HexColor("#EFF6FF")))

    for step in [
        ("1", "Ouvrir la table « events »",
         "Dans Table Editor, cherchez et ouvrez la table « events »."),
        ("2", "Insérer une nouvelle ligne",
         "Cliquez sur « Insert row »."),
        ("3", "Remplir les champs obligatoires",
         "Voir le tableau ci-dessous. Le champ organization_id doit correspondre "
         "à l'ID de l'organisation créée à l'étape A."),
        ("4", "Récupérer l'ID de l'organisation",
         "Dans la table « organizations », copiez la valeur de la colonne « id » "
         "(c'est un code du type : xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)."),
        ("5", "Sauvegarder",
         "Cliquez sur « Save »."),
    ]:
        story.append(step_box(*step))

    ev_fields = [
        ["Champ", "Exemple", "Description"],
        ["name",            "Jazz au Lac 2026",         "Nom de l'événement"],
        ["slug",            "jazz-au-lac-2026",         "Identifiant URL unique"],
        ["organization_id", "(coller l'ID copié)",      "Lie l'événement à l'asso"],
        ["starts_at",       "2026-07-10T18:00:00",      "Date/heure début (format ISO)"],
        ["ends_at",         "2026-07-12T23:00:00",      "Date/heure fin"],
        ["location_name",   "Parc de la Mairie",        "Lieu (affiché aux bénévoles)"],
        ["max_volunteers",  "50",                       "Nombre max de bénévoles"],
        ["is_active",       "true",                     "Mettre true pour activer"],
        ["is_published",    "true",                     "Mettre true pour rendre public"],
    ]
    t4 = Table(ev_fields, colWidths=[3.5*cm, 4.5*cm, None])
    t4.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), VERT_FORET),
        ("TEXTCOLOR",     (0, 0), (-1, 0), white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("LEADING",       (0, 0), (-1, -1), 13),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, GRIS_CLAIR]),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#E5DDD0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t4)

    story.append(Paragraph("Étape C — Créer les postes de bénévoles", H2))
    story.append(Paragraph(
        "Chaque événement doit avoir des postes (« positions ») auxquels les bénévoles "
        "seront affectés. Ajoutez-les dans la table « positions ».",
        BODY))
    story.append(info_box("📌  Table Supabase : positions", BLEU_INFO, HexColor("#EFF6FF")))

    pos_fields = [
        ["Champ",           "Exemple",          "Description"],
        ["event_id",        "(ID de l'événement)", "Lier au bon événement"],
        ["name",            "Bar",              "Nom du poste"],
        ["slug",            "bar",              "Identifiant minuscules"],
        ["color",           "#FF5E5B",          "Couleur d'affichage (hex)"],
        ["needs_count_default", "8",            "Nombre de bénévoles souhaités"],
        ["display_order",   "1",                "Ordre d'affichage"],
        ["is_active",       "true",             "Activer le poste"],
    ]
    t5 = Table(pos_fields, colWidths=[3.5*cm, 4*cm, None])
    t5.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), VERT_FORET),
        ("TEXTCOLOR",     (0, 0), (-1, 0), white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("LEADING",       (0, 0), (-1, -1), 13),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, GRIS_CLAIR]),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#E5DDD0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t5)
    story.append(ok_box(
        "Une fois ces 3 étapes faites, l'événement est accessible à "
        "easyfest.app/[slug-asso]/[slug-evenement]"))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 4 — Supprimer ou révoquer
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(section_header("4", "🗑️", "Supprimer ou révoquer quelqu'un"))

    story.append(Paragraph("4.1  Supprimer une candidature (depuis la Régie)", H2))
    story.append(Paragraph(
        "C'est la méthode la plus simple pour retirer une candidature "
        "(test, doublon, erreur). Elle est accessible directement depuis l'application.",
        BODY))

    for step in [
        ("1", "Se connecter à la Régie",
         "Allez sur easyfest.app et connectez-vous avec votre compte Direction."),
        ("2", "Aller dans « Candidatures »",
         "Dans la barre de navigation de la Régie, cliquez sur 📥 Candidatures."),
        ("3", "Trouver la personne",
         "Utilisez la barre de recherche (nom ou email) pour trouver la candidature."),
        ("4", "Cliquer sur 🗑️",
         "Le bouton poubelle est sur la droite de chaque ligne. "
         "Une confirmation apparaît. Cliquez « OK » pour confirmer."),
        ("5", "Vérifier",
         "La candidature disparaît immédiatement de la liste."),
    ]:
        story.append(step_box(*step))

    story.append(warn_box(
        "La suppression d'une candidature est définitive. "
        "Si la personne a déjà un compte, son compte reste actif "
        "(elle pourra se reconnecter). Pour supprimer aussi l'accès, "
        "utilisez le bouton 🔒 Révoquer."))

    story.append(Paragraph("4.2  Révoquer l'accès d'un membre connecté", H2))
    story.append(Paragraph(
        "Si un bénévole a déjà créé son compte mais doit être exclu de l'événement, "
        "utilisez le bouton Révoquer. Son compte n'est pas supprimé, "
        "mais il n'aura plus accès à l'événement.",
        BODY))

    for step in [
        ("1", "Régie → Candidatures",
         "Allez dans la liste des candidatures, filtrez sur « Validé »."),
        ("2", "Repérer la personne avec ✓ Connecté·e",
         "Seuls les membres qui ont un compte actif ont le bouton Révoquer."),
        ("3", "Cliquer sur 🔒 Révoquer",
         "Une confirmation apparaît. Confirmez pour désactiver leur accès."),
        ("4", "Résultat",
         "La personne ne peut plus se connecter à cet événement spécifique. "
         "Son compte sur les autres événements n'est pas affecté."),
    ]:
        story.append(step_box(*step))

    story.append(Paragraph("4.3  Supprimer définitivement un compte (via Supabase)", H2))
    story.append(Paragraph(
        "Si vous devez supprimer complètement un compte utilisateur "
        "(y compris son accès à tous les événements), utilisez Supabase.",
        BODY))

    for step in [
        ("1", "Supabase → Authentication → Users",
         "Dans le menu gauche de Supabase, cliquez sur « Authentication », puis « Users »."),
        ("2", "Chercher l'utilisateur",
         "Utilisez la barre de recherche pour trouver l'email de la personne."),
        ("3", "Cliquer sur l'utilisateur",
         "Ouvrez la fiche de la personne en cliquant sur son email."),
        ("4", "Supprimer",
         "En bas de la fiche, cliquez sur « Delete user ». Confirmez. "
         "Cette action supprime le compte définitivement."),
    ]:
        story.append(step_box(*step))

    story.append(warn_box(
        "La suppression d'un compte Supabase est irréversible et supprime "
        "toutes les données liées (profil, memberships). "
        "Préférez la Révocation pour les cas courants."))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 5 — Modifications directes Supabase
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(section_header("5", "🔧", "Modifications directes dans Supabase"))
    story.append(Paragraph(
        "Le Table Editor de Supabase vous permet de modifier n'importe quelle "
        "donnée comme un tableur Excel. Voici les opérations les plus courantes.",
        BODY))

    story.append(Paragraph("Modifier une donnée existante", H2))
    for step in [
        ("1", "Ouvrir Table Editor",
         "Dans Supabase, cliquez sur « Table Editor » dans le menu gauche."),
        ("2", "Choisir la table",
         "Sélectionnez la table dans la liste à gauche (ex: events, volunteer_profiles…)."),
        ("3", "Trouver la ligne",
         "Utilisez le filtre (icône entonnoir) pour rechercher par email, nom ou ID."),
        ("4", "Modifier",
         "Double-cliquez sur la cellule à modifier. Tapez la nouvelle valeur."),
        ("5", "Sauvegarder",
         "Appuyez sur Entrée ou cliquez ailleurs. La modification est immédiate."),
    ]:
        story.append(step_box(*step))

    story.append(Spacer(1, 8))
    story.append(Paragraph("Tables utiles et leur contenu", H2))

    tables_ref = [
        ["Table", "Contient", "Modifications courantes"],
        ["organizations",   "Les associations",          "Modifier nom, description, slug"],
        ["events",          "Les événements/festivals",  "Modifier dates, lieu, capacité"],
        ["positions",       "Les postes bénévoles",      "Ajouter/modifier postes, couleurs"],
        ["volunteer_profiles", "Profils bénévoles",      "Corriger nom, email, téléphone"],
        ["memberships",     "Qui a accès à quoi",        "Changer rôle, activer/désactiver"],
        ["volunteer_applications", "Candidatures",       "Modifier statut, notes admin"],
        ["shifts",          "Créneaux horaires",         "Modifier heures, lier aux postes"],
        ["assignments",     "Qui est où (planning)",     "Corriger affectations"],
    ]
    t6 = Table(tables_ref, colWidths=[4*cm, 4.5*cm, None])
    t6.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), VERT_FORET),
        ("TEXTCOLOR",     (0, 0), (-1, 0), white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("LEADING",       (0, 0), (-1, -1), 13),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, GRIS_CLAIR]),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#E5DDD0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t6)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Utiliser les filtres Supabase", H2))
    story.append(Paragraph(
        "Pour trouver une ligne précise sans parcourir toute la table :",
        BODY))
    filter_steps = [
        "Cliquez sur l'icône entonnoir (Filter) en haut du tableau.",
        "Cliquez sur « Add filter ».",
        "Choisissez la colonne (ex: email), l'opérateur (= ou contains), et la valeur.",
        "Cliquez sur « Apply » pour appliquer le filtre.",
        "La liste se réduit aux lignes correspondantes.",
    ]
    for i, txt in enumerate(filter_steps, 1):
        story.append(Paragraph(f"  {i}.  {txt}", BODY_L))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 6 — Safer Space / Médiateurs
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(section_header("6", "🛟", "Safer Space — Gestion des médiateurs"))
    story.append(Paragraph(
        "Le Safer Space est un espace sécurisé où les bénévoles peuvent signaler "
        "des incidents ou indiquer leur niveau de bien-être. "
        "Les médiateurs sont les personnes chargées de traiter ces signalements.",
        BODY))

    story.append(Paragraph("Qui peut voir les alertes Safer Space ?", H2))
    roles_safer = [
        ["Rôle", "Peut soumettre\nun signalement ?", "Peut voir les alertes\nrégie ?"],
        ["volunteer (bénévole)", "✅ Oui", "❌ Non"],
        ["post_lead (resp. poste)", "✅ Oui", "❌ Non"],
        ["staff_scan", "✅ Oui", "❌ Non"],
        ["volunteer_lead (médiateur)", "✅ Oui", "✅ Oui — via /regie/"],
        ["direction", "✅ Oui", "✅ Oui — accès complet"],
    ]
    t7 = Table(roles_safer, colWidths=[5*cm, 4*cm, None])
    t7.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), VERT_FORET),
        ("TEXTCOLOR",     (0, 0), (-1, 0), white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("LEADING",       (0, 0), (-1, -1), 14),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, GRIS_CLAIR]),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#E5DDD0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(t7)
    story.append(Spacer(1, 10))

    story.append(info_box(
        "💡  Pour qu'un médiateur accède à la page Safer Space de la régie, "
        "il suffit de lui attribuer le rôle « volunteer_lead » (voir Section 7). "
        "Il aura alors accès à toute l'interface Régie, y compris Safer.",
        VERT_MOYEN, HexColor("#F0FDF4")))

    story.append(Paragraph("Comment nommer un médiateur Safer Space", H2))
    for step in [
        ("1", "Régie → Candidatures",
         "Connectez-vous en tant que Direction et ouvrez l'onglet Candidatures."),
        ("2", "Trouver le futur médiateur",
         "Filtrez sur « Validé » et cherchez la personne. "
         "Elle doit avoir le statut ✓ Connecté·e."),
        ("3", "Sélectionner le rôle",
         "Dans la colonne Actions, cliquez sur le sélecteur « 🎭 Rôle… » et choisissez "
         "« Resp. bénévoles » (= volunteer_lead)."),
        ("4", "Confirmer",
         "Une fenêtre demande confirmation. Cliquez « OK »."),
        ("5", "Informer la personne",
         "Le médiateur peut maintenant accéder à easyfest.app/regie/[slug]/[evenement]/safer"),
    ]:
        story.append(step_box(*step))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 7 — Changer le rôle d'un bénévole
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(section_header("7", "🎭", "Changer le rôle d'un bénévole"))
    story.append(Paragraph(
        "Les rôles définissent ce que chaque personne peut faire et voir "
        "dans l'application. Seule la Direction peut changer les rôles.",
        BODY))

    story.append(Paragraph("Les 5 rôles disponibles", H2))
    roles_table = [
        ["Rôle",           "Accès",              "Utilisation typique"],
        ["volunteer",      "App bénévole uniquement",
         "Bénévole standard"],
        ["post_lead",      "App bénévole + page de son poste",
         "Responsable d'un stand ou poste spécifique"],
        ["staff_scan",     "Interface scan QR",
         "Personnel d'entrée / contrôle des accès"],
        ["volunteer_lead", "Régie complète",
         "Chef d'équipe, médiateur Safer, coordinateur"],
        ["direction",      "Régie complète + gestion des rôles",
         "Organisateurs principaux, admin"],
    ]
    t8 = Table(roles_table, colWidths=[3.5*cm, 5*cm, None])
    t8.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), VERT_FORET),
        ("TEXTCOLOR",     (0, 0), (-1, 0), white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("LEADING",       (0, 0), (-1, -1), 13),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, GRIS_CLAIR]),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#E5DDD0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t8)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Comment changer un rôle", H2))
    for step in [
        ("1", "Régie → Candidatures → filtrer sur « Validé »",
         "Ouvrez la liste des candidatures validées."),
        ("2", "Trouver la personne (✓ Connecté·e requis)",
         "Le changement de rôle n'est possible que pour les membres qui ont un compte actif."),
        ("3", "Cliquer sur « 🎭 Rôle… »",
         "Le menu déroulant liste les 5 rôles disponibles."),
        ("4", "Sélectionner le nouveau rôle",
         "Choisissez le rôle souhaité dans la liste."),
        ("5", "Confirmer dans la boîte de dialogue",
         "Une confirmation apparaît avec le nom de la personne et le nouveau rôle. "
         "Cliquez OK."),
        ("6", "Le changement est immédiat",
         "La personne aura accès à ses nouveaux droits dès sa prochaine connexion."),
    ]:
        story.append(step_box(*step))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════════════════════
    # SECTION 8 — Aide-mémoire rapide
    # ═══════════════════════════════════════════════════════════════════════════
    story.append(section_header("8", "⚡", "Aide-mémoire rapide"))
    story.append(Paragraph("Ce que vous voulez faire → Où aller", H2))

    cheatsheet = [
        ["Je veux…",                                "Outil",              "Section"],
        ["Modifier le slogan de la page d'accueil", "GitHub",             "2"],
        ["Modifier un texte visible sur le site",   "GitHub",             "2"],
        ["Créer un nouvel événement/festival",      "Supabase",           "3"],
        ["Ajouter des postes à un événement",       "Supabase → positions","3C"],
        ["Supprimer une candidature de test",       "Régie → Candidatures","4.1"],
        ["Révoquer l'accès d'un bénévole",         "Régie → Candidatures","4.2"],
        ["Supprimer complètement un compte",        "Supabase → Auth",    "4.3"],
        ["Corriger le nom/email d'un bénévole",    "Supabase → volunteer_profiles","5"],
        ["Nommer un médiateur Safer Space",         "Régie → rôle volunteer_lead","6"],
        ["Donner accès à la régie",                 "Régie → rôle direction/v_lead","7"],
        ["Corriger une date d'événement",           "Supabase → events",  "5"],
        ["Voir les alertes Safer Space",            "Régie → onglet Safer","6"],
    ]
    t9 = Table(cheatsheet, colWidths=[8*cm, 4.5*cm, 2*cm])
    t9.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), VERT_FORET),
        ("TEXTCOLOR",     (0, 0), (-1, 0), white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("LEADING",       (0, 0), (-1, -1), 13),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, GRIS_CLAIR]),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#E5DDD0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t9)

    story.append(Spacer(1, 16))
    story.append(Paragraph("Contacts & Accès", H2))
    contacts = [
        ["Ressource",                "Adresse / Info"],
        ["Application EasyFest",     "https://easyfest.app"],
        ["Régie (direction)",        "easyfest.app/regie/[slug-asso]/[slug-evenement]"],
        ["Dashboard Supabase",       "https://supabase.com/dashboard/project/wsmehckdgnpbzwjvotro"],
        ["Code source GitHub",       "github.com/Easyfest/easyfest"],
        ["Mot de passe comptes test","RdlFest@2026"],
    ]
    t10 = Table(contacts, colWidths=[5.5*cm, None])
    t10.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), VERT_FORET),
        ("TEXTCOLOR",     (0, 0), (-1, 0), white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 9),
        ("FONTNAME",      (0, 1), (-1, -1), "Helvetica"),
        ("LEADING",       (0, 0), (-1, -1), 13),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [white, GRIS_CLAIR]),
        ("GRID",          (0, 0), (-1, -1), 0.5, HexColor("#E5DDD0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(t10)

    story.append(Spacer(1, 20))
    story.append(Paragraph(
        "Document généré automatiquement — EasyFest Admin Guide v1.0 — Mai 2026",
        s("Footer", fontName="Helvetica-Oblique", fontSize=8, textColor=MUTED,
          alignment=TA_CENTER)))

    return story


# ── Build ─────────────────────────────────────────────────────────────────────
def main():
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        leftMargin=2*cm, rightMargin=2*cm,
        topMargin=2*cm, bottomMargin=1.5*cm,
        title="EasyFest — Guide Administrateur",
        author="EasyFest",
        subject="Guide d'administration non-technique",
    )
    story = build_content()
    doc.build(story, onFirstPage=on_first_page, onLaterPages=on_page)
    print(f"PDF généré : {OUTPUT}")


if __name__ == "__main__":
    main()
