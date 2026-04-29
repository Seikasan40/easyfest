export default function CharterPage() {
  return (
    <article className="prose prose-sm max-w-none">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold">Charte du festival & engagements</h1>
        <p className="text-sm text-brand-ink/60">
          Tu as accepté ces engagements à l'inscription. Ils s'appliquent pendant toute la
          durée du festival.
        </p>
      </header>

      <h2>📜 Charte du festival</h2>
      <p>
        En tant que bénévole, je m'engage à :
      </p>
      <ul>
        <li>Respecter les horaires de mes shifts et prévenir mon·ma responsable en cas d'imprévu.</li>
        <li>Porter mon bracelet bénévole de manière visible.</li>
        <li>Adopter une attitude bienveillante envers le public, les artistes et les autres bénévoles.</li>
        <li>Respecter les consignes de sécurité du site et les directives des responsables.</li>
        <li>Signaler tout incident à un·e responsable ou via le bouton d'alerte de l'app.</li>
      </ul>

      <h2 className="mt-8">🤝 Engagement anti-harcèlement</h2>
      <p>
        Le festival a une politique <strong>tolérance zéro</strong> face au harcèlement, à toutes les formes
        de discrimination (sexisme, racisme, LGBTphobie, validisme, classisme), aux violences verbales
        ou physiques, et à tout comportement inadéquat.
      </p>
      <p>
        En cas de témoin ou de victime :
      </p>
      <ul>
        <li>Active le bouton <strong>ALERTE GRAVE</strong> dans l'onglet Bien-être.</li>
        <li>Adresse-toi à un·e responsable identifiable (badge couleur).</li>
        <li>Contacte directement les médiateur·ices désigné·es : Sandy, Florence.</li>
      </ul>
      <p>
        Toute personne signalée pour harcèlement fait l'objet d'une procédure de modération
        avec validation collégiale (3 personnes minimum) avant éviction du festival.
      </p>

      <h2 className="mt-8">🛡️ Protection des données (RGPD)</h2>
      <p>
        Tes données personnelles (identité, contact, allergies, photos) sont stockées en
        Union Européenne, chiffrées au repos. Elles ne sont accessibles qu'aux personnes
        habilitées (responsables bénévoles, régie, catering pour les allergies).
      </p>
      <p>
        Tu peux à tout moment : accéder à tes données, les rectifier, les supprimer.
        Contact : <a href="mailto:dpo@easyfest.app">dpo@easyfest.app</a>.
      </p>

      <h2 className="mt-8">📞 Numéros utiles</h2>
      <ul>
        <li>Régie générale : voir avec ton·ta responsable</li>
        <li>SAMU (urgence médicale) : <strong>15</strong></li>
        <li>Pompiers : <strong>18</strong></li>
        <li>Police-secours : <strong>17</strong></li>
        <li>Numéro européen d'urgence : <strong>112</strong></li>
      </ul>
    </article>
  );
}
