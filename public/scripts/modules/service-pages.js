import { escapeHtml } from './content-markup.js';

const services = [
  {
    slug: 'video-production-athens',
    en: {
      title: 'Video Production in Athens',
      description: 'Film and video production in Athens, from concept and planning to filming, editing and delivery. Discuss brand films, interviews and campaigns with Anchev Films.',
      intro: 'Anchev Films develops and produces films in Athens for brands, organisations and original projects. We bring creative direction and practical production planning together, from the first conversation to the final master.',
      sections: [
        ['Films built around the brief', 'Commercials, brand films, interviews, documentary-led stories and social-first campaigns each need a different approach. We start with your audience, message and intended release, then shape the format and production around those decisions.'],
        ['From idea to filming', 'Concepts, treatments, scripts and shot lists give the team a shared direction. Pre-production brings together budgeting, scheduling, casting, locations, crew and equipment. Filming can take place on location or in the studio, depending on the brief.'],
        ['A complete delivery plan', 'Editing, colour grading, sound design and finishing turn the footage into the film. Agree the required masters, social cutdowns, aspect ratios, captions and subtitles before production so the final handover fits your release.']
      ],
      brief: 'Send the purpose of the film, intended audience, reference material, preferred filming dates, budget range and delivery formats. We can discuss the creative approach and define a realistic scope before scheduling production.'
    },
    el: {
      title: 'Παραγωγή βίντεο στην Αθήνα',
      description: 'Παραγωγή ταινιών και βίντεο στην Αθήνα από την Anchev Films. Δημιουργική ανάπτυξη, προετοιμασία, γυρίσματα, μοντάζ και παράδοση για κάθε ανάγκη προβολής.',
      intro: 'Η Anchev Films αναπτύσσει και παράγει ταινίες στην Αθήνα για brands, οργανισμούς και ανεξάρτητα έργα. Συνδυάζουμε τη δημιουργική κατεύθυνση με τον πρακτικό σχεδιασμό, από την πρώτη συζήτηση έως την τελική παράδοση.',
      sections: [
        ['Η ταινία ξεκινά από τον στόχο', 'Διαφημιστικά, ταινίες για brands, συνεντεύξεις, ιστορίες με προσέγγιση ντοκιμαντέρ και βίντεο για κοινωνικά δίκτυα απαιτούν διαφορετικό σχεδιασμό. Ξεκινάμε από το κοινό, το μήνυμα και τα κανάλια προβολής, ώστε να επιλέξουμε την κατάλληλη μορφή.'],
        ['Από την ιδέα στο γύρισμα', 'Η ιδέα, το σενάριο και το πλάνο λήψεων δίνουν κοινή κατεύθυνση στην ομάδα. Η προετοιμασία περιλαμβάνει προϋπολογισμό, χρονοδιάγραμμα, casting, χώρους, συνεργείο και εξοπλισμό. Τα γυρίσματα οργανώνονται σε τοποθεσία ή στο στούντιο, ανάλογα με τις ανάγκες.'],
        ['Παράδοση για τα σωστά κανάλια', 'Το μοντάζ, η χρωματική επεξεργασία, ο σχεδιασμός ήχου και το τελικό φινίρισμα ολοκληρώνουν την ταινία. Συμφωνούμε εξαρχής τις τελικές εκδόσεις, τα σύντομα βίντεο, τις αναλογίες εικόνας και τους υπότιτλους που χρειάζεται η προβολή σας.']
      ],
      brief: 'Στείλτε μας τον στόχο, το κοινό, υλικό αναφοράς, επιθυμητές ημερομηνίες, ενδεικτικό προϋπολογισμό και μορφές παράδοσης. Θα συζητήσουμε την προσέγγιση και το εύρος του έργου πριν οργανώσουμε τα γυρίσματα.'
    },
    hasProductionExample: true
  },
  {
    slug: 'corporate-video-production',
    en: {
      title: 'Corporate Video Production',
      description: 'Corporate video production in Athens for company stories, interviews and communications. Plan filming, approvals and platform-ready delivery with Anchev Films.',
      intro: 'A corporate film needs a clear purpose, not just a polished image. Anchev Films helps turn your company story, people and message into a production brief that can be filmed and delivered with clear responsibility.',
      sections: [
        ['Choose the communication goal', 'Company profiles, leadership interviews, team stories and testimonials serve different audiences. Define whether the film is for customers, colleagues, recruitment or an event, then agree the message, duration and distribution channels.'],
        ['Prepare people and locations', 'Interview questions, scripts and shot lists keep filming focused. We plan crew, equipment, locations and the schedule around the working environment. Identify contributors and approval responsibilities early so production does not interrupt essential operations.'],
        ['Keep review and delivery clear', 'Agree the review stages and required outputs before the shoot. Editing, colour, sound and graphics support a consistent final film, with captions, subtitles and shorter versions included where they are part of the agreed scope.']
      ],
      brief: 'Share the communication objective, company or department, contributors, filming locations, approval process and deadline. Include your brand guidelines and required versions so we can plan the production around your team.'
    },
    el: {
      title: 'Παραγωγή εταιρικού βίντεο',
      description: 'Εταιρικά βίντεο στην Αθήνα από την Anchev Films. Παρουσιάσεις εταιρειών, συνεντεύξεις και εταιρική επικοινωνία με οργανωμένα γυρίσματα και τελική παράδοση.',
      intro: 'Ένα εταιρικό βίντεο χρειάζεται σαφή σκοπό, όχι μόνο προσεγμένη εικόνα. Η Anchev Films μετατρέπει την ιστορία, τους ανθρώπους και το μήνυμα της εταιρείας σας σε ένα οργανωμένο πλάνο παραγωγής.',
      sections: [
        ['Ορίστε τον επικοινωνιακό στόχο', 'Η παρουσίαση μιας εταιρείας, οι συνεντεύξεις στελεχών, οι ιστορίες της ομάδας και οι μαρτυρίες πελατών απευθύνονται σε διαφορετικά κοινά. Συμφωνούμε το μήνυμα, τη διάρκεια και τα κανάλια προβολής με βάση τον πραγματικό στόχο.'],
        ['Προετοιμασία ανθρώπων και χώρων', 'Οι ερωτήσεις, το σενάριο και το πλάνο λήψεων κρατούν τα γυρίσματα στοχευμένα. Σχεδιάζουμε συνεργείο, εξοπλισμό, χώρους και ωράρια με βάση το περιβάλλον εργασίας. Οι συμμετέχοντες και οι υπεύθυνοι εγκρίσεων ορίζονται νωρίς.'],
        ['Σαφείς εγκρίσεις και παραδοτέα', 'Πριν από το γύρισμα συμφωνούμε τα στάδια ελέγχου και τις τελικές εκδόσεις. Μοντάζ, χρώμα, ήχος και γραφικά υπηρετούν το μήνυμα, ενώ υπότιτλοι και σύντομες εκδοχές εντάσσονται στο συμφωνημένο εύρος παραγωγής.']
      ],
      brief: 'Στείλτε τον στόχο επικοινωνίας, τους συμμετέχοντες, τις τοποθεσίες, τη διαδικασία εγκρίσεων και την προθεσμία. Προσθέστε τις οδηγίες εταιρικής ταυτότητας και τις εκδόσεις που χρειάζεστε για να σχεδιάσουμε την παραγωγή γύρω από την ομάδα σας.'
    }
  },
  {
    slug: 'production-services-greece',
    en: {
      title: 'Production Services in Greece',
      description: 'Production planning and film production services in Greece with an Athens-based partner. Discuss locations, crew, equipment, schedules and post-production.',
      intro: 'For a production in Greece, creative ambition needs a workable local plan. Based in Athens, Anchev Films brings together the preparation, filming and delivery decisions that keep a project organised.',
      sections: [
        ['Define the local scope', 'Share the treatment, script, shoot locations and the responsibilities already covered by your team. We can discuss budgeting, scheduling, location scouting, casting and production logistics, then agree what Anchev Films will coordinate.'],
        ['Build the production plan', 'Crew and equipment choices follow the creative and technical brief. Location requirements, permissions, art direction and loading arrangements need to be reviewed ahead of filming. Availability, permissions and costs are confirmed for the specific production, not assumed.'],
        ['Connect the shoot to delivery', 'Agree how material will move from set into editing and finishing, and who is responsible at each stage. Post-production and final versions can be included in the scope, or coordinated around the delivery requirements of your existing team.']
      ],
      brief: 'Send the treatment or script, proposed locations in Greece, shoot dates, crew size, equipment needs and budget range. Tell us which services your team already provides and which local responsibilities you need us to discuss.'
    },
    el: {
      title: 'Υπηρεσίες παραγωγής στην Ελλάδα',
      description: 'Υπηρεσίες κινηματογραφικής παραγωγής στην Ελλάδα με βάση την Αθήνα. Προετοιμασία, τοποθεσίες, συνεργείο, εξοπλισμός και post-production από την Anchev Films.',
      intro: 'Μια παραγωγή στην Ελλάδα χρειάζεται δημιουργική κατεύθυνση και ένα εφαρμόσιμο τοπικό πλάνο. Με βάση την Αθήνα, η Anchev Films συντονίζει την προετοιμασία, τα γυρίσματα και τις αποφάσεις παράδοσης ενός έργου.',
      sections: [
        ['Συμφωνούμε το εύρος συνεργασίας', 'Μοιραστείτε το σενάριο, τις τοποθεσίες και τις αρμοδιότητες που έχει ήδη αναλάβει η ομάδα σας. Συζητάμε προϋπολογισμό, χρονοδιάγραμμα, αναζήτηση χώρων, casting και οργάνωση παραγωγής, ώστε να ορίσουμε τι θα συντονίσει η Anchev Films.'],
        ['Οργανώνουμε το πλάνο παραγωγής', 'Συνεργείο και εξοπλισμός επιλέγονται με βάση τις δημιουργικές και τεχνικές απαιτήσεις. Χώροι, άδειες, σκηνικά και πρόσβαση για εξοπλισμό εξετάζονται πριν από το γύρισμα. Διαθεσιμότητα, εγκρίσεις και κόστος επιβεβαιώνονται για το συγκεκριμένο έργο.'],
        ['Συνδέουμε το γύρισμα με την παράδοση', 'Συμφωνούμε τη ροή του υλικού προς το μοντάζ και την τελική επεξεργασία, καθώς και τις ευθύνες κάθε σταδίου. Το post-production μπορεί να ενταχθεί στη συνεργασία ή να οργανωθεί σύμφωνα με τις ανάγκες της δικής σας ομάδας.']
      ],
      brief: 'Στείλτε σενάριο ή treatment, προτεινόμενες τοποθεσίες στην Ελλάδα, ημερομηνίες, μέγεθος συνεργείου, ανάγκες εξοπλισμού και ενδεικτικό προϋπολογισμό. Διευκρινίστε ποιες υπηρεσίες καλύπτει ήδη η ομάδα σας και ποια τοπική υποστήριξη χρειάζεστε.'
    },
    hasProductionExample: true
  },
  {
    slug: 'live-streaming-athens',
    en: {
      title: 'Event Filming & Live Streaming in Athens',
      description: 'Discuss event filming and live-streaming production in Athens with Anchev Films. Multi-camera coverage, highlight films and studio connectivity planning.',
      intro: 'Events have a fixed moment and a moving schedule. Anchev Films plans event film production around the programme, the audience and the footage or live output your team needs.',
      sections: [
        ['Cover the event with a clear plan', 'Conferences, corporate events, performances and product launches need coverage that follows the programme. Multi-camera filming, interviews and highlight or recap films can be scoped around the moments that matter.'],
        ['Review the live requirements', 'For live-streaming enquiries, share the destination platform, audience access, camera coverage, audio feeds and venue connection details. The technical setup and connectivity must be reviewed and tested for the event before a live production is confirmed.'],
        ['Studio or venue production', 'Anchev Studio in Melissia has fast internet for live-streaming productions and three-phase power. For studio and on-location work alike, agree the schedule, crew access, technical responsibilities and any edited films needed after the event.']
      ],
      brief: 'Send the event date, venue, programme, expected duration, streaming platform and required coverage. Include venue technical contacts, connectivity details and whether you also need recordings or edited highlights.'
    },
    el: {
      title: 'Βιντεοσκόπηση εκδηλώσεων και live streaming στην Αθήνα',
      description: 'Βιντεοσκόπηση εκδηλώσεων και σχεδιασμός live streaming στην Αθήνα. Πολυκάμερη κάλυψη, βίντεο στιγμιοτύπων και τεχνική προετοιμασία με την Anchev Films.',
      intro: 'Μια εκδήλωση έχει συγκεκριμένη ημερομηνία και πρόγραμμα που εξελίσσεται. Η Anchev Films σχεδιάζει την κάλυψη με βάση τη ροή, το κοινό και το υλικό ή τη ζωντανή έξοδο που χρειάζεται η ομάδα σας.',
      sections: [
        ['Κάλυψη με ξεκάθαρο πλάνο', 'Συνέδρια, εταιρικές εκδηλώσεις, παραστάσεις και παρουσιάσεις προϊόντων χρειάζονται κάλυψη που ακολουθεί το πρόγραμμα. Η πολυκάμερη βιντεοσκόπηση, οι συνεντεύξεις και τα βίντεο στιγμιοτύπων σχεδιάζονται γύρω από τις σημαντικές στιγμές.'],
        ['Έλεγχος απαιτήσεων ζωντανής μετάδοσης', 'Για live streaming, στείλτε την πλατφόρμα, τον τρόπο πρόσβασης του κοινού, την κάλυψη καμερών, τις πηγές ήχου και τα στοιχεία σύνδεσης του χώρου. Η τεχνική διάταξη και η συνδεσιμότητα εξετάζονται και δοκιμάζονται πριν επιβεβαιωθεί η παραγωγή.'],
        ['Στο στούντιο ή στον χώρο σας', 'Το Anchev Studio στα Μελίσσια διαθέτει γρήγορο internet για ζωντανές παραγωγές και τριφασικό ρεύμα. Συμφωνούμε ωράρια, πρόσβαση συνεργείου, τεχνικές ευθύνες και τις ανάγκες για μονταρισμένα βίντεο μετά την εκδήλωση.']
      ],
      brief: 'Στείλτε ημερομηνία, χώρο, πρόγραμμα, διάρκεια, πλατφόρμα μετάδοσης και επιθυμητή κάλυψη. Προσθέστε στοιχεία τεχνικού υπευθύνου, πληροφορίες σύνδεσης και τις ανάγκες σας για εγγραφές ή μονταρισμένα στιγμιότυπα.'
    }
  }
];

const studio = {
  slug: 'studio',
  isStudio: true,
  en: { title: 'Anchev Studio in Melissia' },
  el: {
    title: 'Anchev Studio στα Μελίσσια',
    description: 'Χώρος παραγωγής στα Μελίσσια, Αθήνα: 12 × 16 μέτρα, ύψος 5 μέτρα, πρόσβαση αυτοκινήτου, γρήγορο internet και τριφασικό ρεύμα. Επικοινωνήστε με την Anchev Films.',
    intro: 'Το Anchev Studio είναι ο χώρος που παρουσιάζει η Anchev Films για γυρίσματα και ζωντανές παραγωγές στα Μελίσσια Αττικής. Για διαθεσιμότητα και οργάνωση της παραγωγής, επικοινωνήστε με την Anchev Films πριν προγραμματίσετε την επίσκεψή σας.',
    sections: [
      ['Διαστάσεις και διάταξη', 'Ο χώρος έχει πλάτος 12 μέτρα, βάθος 16 μέτρα και ύψος 5 μέτρα. Το κατά προσέγγιση αποτύπωμα είναι 192 τ.μ., όχι μέτρηση της καθαρής διαθέσιμης επιφάνειας. Υπάρχει χώρος για αυτοκίνητο στο εσωτερικό· οι διαστάσεις του οχήματος και η διάταξη του σκηνικού ελέγχονται πριν από το γύρισμα.'],
      ['Πρόσβαση, ρεύμα και σύνδεση', 'Φορτηγό μπορεί να προσεγγίσει την είσοδο για μεταφορά εξοπλισμού. Διατίθενται τριφασικό ρεύμα και γρήγορη σύνδεση internet για live streaming. Ισχύς, συνδέσεις, απαιτήσεις μετάδοσης και διαδικασία εκφόρτωσης συμφωνούνται και ελέγχονται για κάθε παραγωγή.'],
      ['Τοποθεσία και άφιξη', 'Αποστόλου Ράπτη 5, Μελίσσια 151 27, Ελλάδα. Στο Google Maps η τοποθεσία εμφανίζεται ως Hologram Studio. Χρησιμοποιήστε αυτή την καταχώριση για οδηγίες και επικοινωνήστε με την Anchev Films για να συντονίσουμε την άφιξη και την πρόσβαση.']
    ],
    brief: 'Στείλτε επιθυμητές ημερομηνίες, αριθμό συνεργατών, διαστάσεις σκηνικού ή οχήματος, λίστα εξοπλισμού και ανάγκες ζωντανής μετάδοσης. Θα επιβεβαιώσουμε διαθεσιμότητα, πρόσβαση και τεχνικές απαιτήσεις.'
  }
};

export const servicePages = services;
export const getSiteContentPath = (id, language = 'en') => {
  const prefix = language === 'el' ? '/el' : '';
  if (id === 'studio') return `${prefix}/studio`;
  if (id === 'contact') return `${prefix}/`;
  const service = services.find((entry) => id === `service-${entry.slug}`);
  return service ? `${prefix}/services/${service.slug}` : null;
};
export const getServicePath = (page, language = 'en') => `${language === 'el' ? '/el' : ''}${page.isStudio ? '/studio' : `/services/${page.slug}`}`;
export const getServicePage = (pathname, managed = null) => {
  const page = [...services, studio].find((entry) => getServicePath(entry, 'en') === pathname || getServicePath(entry, 'el') === pathname);
  if (!page || !managed) return page;
  const language = pathname.startsWith('/el/') ? 'el' : 'en';
  const hero = managed.blocks.find((block) => block.type === 'image');
  return { ...page, heroImage: hero?.url, heroAlt: hero?.alt,
    mediaBlocks: managed.blocks.filter((block) => block.type !== 'text' && block.type !== 'fact' && block !== hero),
    seo: managed.seo,
    [language]: { ...page[language], title: managed.heading, intro: managed.intro,
      description: managed.seo?.description || managed.intro,
      sections: managed.blocks.filter((block) => block.type === 'text').map((block) => [block.title, block.text]),
      brief: managed.body } };
};
export const getLanguageAlternates = (page) => ['en', 'el'].map((language) => ({ language, path: getServicePath(page, language) }));

export const renderServiceLinks = (language = 'en', currentSlug = '') => services
  .filter((page) => page.slug !== currentSlug)
  .map((page) => `<a class="case-study__external" href="${getServicePath(page, language)}">${escapeHtml(page[language].title)}</a>`).join('');

export const renderServicePageMarkup = (page, language, projects, contact) => {
  const copy = page[language];
  const greek = language === 'el';
  const example = page.hasProductionExample ? projects.find((project) => project.id === 'anti-bullying') : null;
  const alternateLanguage = greek ? 'en' : 'el';
  return `<article class="case-study case-study--standalone service-page is-open">
    <div class="case-study__shell">
      <header class="case-study__header">
        <a class="case-study__close" href="/">Anchev Films</a>
        <a class="case-study__close" href="${getServicePath(page, alternateLanguage)}" lang="${alternateLanguage}" hreflang="${alternateLanguage}">${greek ? 'English' : 'Ελληνικά'}</a>
      </header>
      <main>
        <section class="case-study__hero" aria-labelledby="service-title">
          <div class="case-study__hero-media"><img src="${escapeHtml(page.heroImage || '/media/studio/studio-frame-01.jpg')}" alt="${escapeHtml(page.heroAlt || (greek ? 'Εσωτερικό του Anchev Studio στα Μελίσσια' : 'Inside Anchev Studio in Melissia'))}" fetchpriority="high" /></div>
          <div class="case-study__hero-content"><p class="case-study__meta">Anchev Films / ${greek ? 'Αθήνα, Ελλάδα' : 'Athens, Greece'}</p><h1 id="service-title">${escapeHtml(copy.title)}</h1></div>
        </section>
        <div class="case-study__content">
          <p>${escapeHtml(copy.intro)}</p>
          ${copy.sections.map(([title, text], index) => `<section class="case-study__copy-section"><p class="case-study__section-label">0${index + 1}</p><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(text)}</p></div></section>`).join('')}
          ${(page.mediaBlocks || []).map((block) => block.type === 'image' ? `<figure><img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.alt)}" loading="lazy" />${block.text ? `<figcaption>${escapeHtml(block.text)}</figcaption>` : ''}</figure>` : block.type === 'video' ? `<video src="${escapeHtml(block.url)}" controls playsinline preload="none" aria-label="${escapeHtml(block.title || copy.title)}"></video>` : `<p><a class="case-study__external" href="${escapeHtml(block.url)}">${escapeHtml(block.title || block.url)}</a></p>`).join('')}
          ${example ? `<section class="case-study__copy-section"><p class="case-study__section-label">${greek ? 'Παραγωγή' : 'Production example'}</p><div><h2>${escapeHtml(example.name)}</h2><p>${greek ? 'Ανεξάρτητη ταινία κατά του σχολικού εκφοβισμού, με μαθητές του 56ου Γυμνασίου Αθηνών. Δείτε την προετοιμασία, την παραγωγή και τους συντελεστές.' : 'An independent anti-bullying film made with students of the 56th Junior High School of Athens. Explore the brief, production approach and credits.'}</p><a class="case-study__external" href="/work/${encodeURIComponent(example.id)}">${greek ? 'Δείτε την παραγωγή' : 'Explore the production'}</a></div></section>` : ''}
          ${page.isStudio ? '<a class="case-study__external" href="https://www.google.com/maps/dir/?api=1&amp;destination=Apostolou%20Rapti%205%2C%20Melissia%20151%2027%2C%20Greece" target="_blank" rel="noreferrer">Google Maps</a>' : `<a class="case-study__external" href="${greek ? '/el/studio' : '/studio'}">${greek ? 'Anchev Studio στα Μελίσσια' : 'Anchev Studio in Melissia'}</a>`}
          <section class="case-study__copy-section"><p class="case-study__section-label">${greek ? 'Το έργο σας' : 'Your brief'}</p><div><h2>${greek ? 'Ας συζητήσουμε την παραγωγή σας' : 'Discuss your production'}</h2><p>${escapeHtml(copy.brief)}</p>${contact.email ? `<a class="case-study__external" href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a>` : '<a class="case-study__external" href="/#contact-page">Contact Anchev Films</a>'}${contact.phone ? `<a class="case-study__external" href="tel:${escapeHtml(contact.phone.replace(/[^+\d]/g, ''))}">${escapeHtml(contact.phone)}</a>` : ''}</div></section>
          <nav class="service-page__links" aria-label="${greek ? 'Υπηρεσίες παραγωγής' : 'Production services'}">${renderServiceLinks(language, page.slug)}</nav>
        </div>
      </main>
    </div>
  </article>`;
};