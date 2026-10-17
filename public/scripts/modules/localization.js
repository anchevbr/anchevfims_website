export const locale = () => typeof document !== 'undefined' && document.documentElement.lang === 'el' ? 'el' : 'en';

export const homepageFields = [
  { key: 'heroKicker', label: 'Opening label', selector: '.hero-kicker' },
  { key: 'heroPositioning', label: 'Opening introduction', selector: '.hero-positioning', area: true },
  ...['Direction', 'Production', 'Film'].flatMap((label, index) => [
    { key: `story${index}Label`, label: `${label} label`, selector: `[data-story-scene="${index}"] .story-scene-number` },
    { key: `story${index}Heading`, label: `${label} heading`, selector: `[data-story-scene="${index}"] h2` },
    { key: `story${index}Body`, label: `${label} introduction`, selector: `[data-story-scene="${index}"] > p:last-child`, area: true }
  ]),
  { key: 'workHeading', label: 'Selected work heading', selector: '#work-title' },
  { key: 'workIntro', label: 'Selected work introduction', selector: '#work-page .experience-heading > p:last-child', area: true },
  { key: 'studioHeading', label: 'Studio heading', selector: '#studio-feature-title' },
  { key: 'servicesHeading', label: 'Services heading', selector: '#services-title' },
  { key: 'servicesIntro', label: 'Services introduction', selector: '#services-page .experience-heading > p:last-child', area: true },
  { key: 'clientsHeading', label: 'Clients heading', selector: '#clients-title' },
  { key: 'podcastHeading', label: 'Podcast heading', selector: '#podcast-title' },
  { key: 'articlesHeading', label: 'Articles heading', selector: '#articles-title' },
  { key: 'articlesIntro', label: 'Articles introduction', selector: '.articles-heading > div > p', area: true }
];

const dictionaries = {
  en: {
    start: 'Start a project', contactTitle: "Let's talk about the film.",
    email: 'Email', phone: 'Telephone', worldwide: 'Available worldwide', name: 'Name', company: 'Company', message: 'Your production brief',
    inquiryTitle: 'Send a brief.', send: 'Send brief', sending: 'Sending...',
    checkFields: 'Check the following fields. Your entries have been kept.', requiredField: 'Complete this field.', invalidEmail: 'Enter a valid email address with an @ symbol.', minLength: 'Enter at least', characters: 'characters.', privacyRequired: 'Confirm the privacy notice before sending.',
    privacy: 'I agree to the processing of my details to respond to this inquiry.', privacyLink: 'Privacy notice',
    success: 'Your inquiry has been received. Thank you.', error: 'Your inquiry could not be sent. Try again or email us.',
    work: 'Selected work', viewFilm: 'View film', all: 'All projects', filter: 'Filter productions', search: 'Search productions',
    back: 'Back to work', brief: 'The brief', approach: 'Our approach', production: 'The production', film: 'The film',
    director: 'Director', producer: 'Producer', dop: 'Director of photography', location: 'Location', duration: 'Duration', services: 'Services', deliverables: 'Deliverables',
    behind: 'Behind the scenes', press: 'In the press', credits: 'Credits', next: 'More selected work', startProject: 'Start a project',
    play: 'Play', pause: 'Pause', episode: 'Episode', openEpisode: 'Open episode',
    readArticle: 'Read article', articlesEmpty: 'New stories will appear here.', articlesUnavailable: 'Articles are temporarily unavailable.',
    podcastEmpty: 'New episodes will appear here.', followSpotify: 'Follow on Spotify', podcastUnavailable: 'Episodes are available on',
    close: 'Close', base: 'Base', caseStudy: 'case study', watchYoutube: 'Watch on YouTube', readCoverage: 'Read the coverage', gallery: 'Production gallery', viewProject: 'View project', photograph: 'Production photograph', hours: 'hr', minutes: 'min'
  },
  el: {
    start: 'Η επόμενη παραγωγή σας', contactTitle: 'Ας μιλήσουμε για την ταινία σας.',
    email: 'Email', phone: 'Τηλέφωνο', worldwide: 'Παραγωγές στην Ελλάδα και διεθνώς', name: 'Ονοματεπώνυμο', company: 'Εταιρεία', message: 'Η παραγωγή που σχεδιάζετε',
    inquiryTitle: 'Στείλτε το brief.', send: 'Αποστολή brief', sending: 'Αποστολή...',
    checkFields: 'Ελέγξτε τα παρακάτω πεδία. Τα στοιχεία σας έχουν διατηρηθεί.', requiredField: 'Συμπληρώστε το πεδίο.', invalidEmail: 'Συμπληρώστε έγκυρη διεύθυνση email με το σύμβολο @.', minLength: 'Συμπληρώστε τουλάχιστον', characters: 'χαρακτήρες.', privacyRequired: 'Επιβεβαιώστε την ενημέρωση απορρήτου πριν από την αποστολή.',
    privacy: 'Συμφωνώ με την επεξεργασία των στοιχείων μου για την απάντηση στο αίτημά μου.', privacyLink: 'Πολιτική απορρήτου',
    success: 'Λάβαμε το αίτημά σας. Ευχαριστούμε.', error: 'Το αίτημα δεν στάλθηκε. Δοκιμάστε ξανά ή επικοινωνήστε με email.',
    work: 'Επιλεγμένες παραγωγές', viewFilm: 'Δείτε την ταινία', all: 'Όλες οι παραγωγές', filter: 'Κατηγορία παραγωγής', search: 'Αναζήτηση παραγωγών',
    back: 'Επιστροφή στις παραγωγές', brief: 'Το ζητούμενο', approach: 'Η προσέγγισή μας', production: 'Η παραγωγή', film: 'Η ταινία',
    director: 'Σκηνοθεσία', producer: 'Παραγωγή', dop: 'Διεύθυνση φωτογραφίας', location: 'Τοποθεσία', duration: 'Διάρκεια', services: 'Υπηρεσίες', deliverables: 'Παραδοτέα',
    behind: 'Πίσω από τις κάμερες', press: 'Στον Τύπο', credits: 'Συντελεστές', next: 'Περισσότερες παραγωγές', startProject: 'Συζητήστε την παραγωγή σας',
    play: 'Αναπαραγωγή', pause: 'Παύση', episode: 'Επεισόδιο', openEpisode: 'Άνοιγμα επεισοδίου',
    readArticle: 'Διαβάστε το άρθρο', articlesEmpty: 'Σύντομα θα προστεθούν νέες ιστορίες.', articlesUnavailable: 'Τα άρθρα δεν είναι προσωρινά διαθέσιμα.',
    podcastEmpty: 'Σύντομα θα προστεθούν νέα επεισόδια.', followSpotify: 'Ακολουθήστε στο Spotify', podcastUnavailable: 'Τα επεισόδια είναι διαθέσιμα στο',
    close: 'Κλείσιμο', base: 'Έδρα', caseStudy: 'παραγωγή', watchYoutube: 'Δείτε στο YouTube', readCoverage: 'Διαβάστε το δημοσίευμα', gallery: 'Εικόνες παραγωγής', viewProject: 'Δείτε την παραγωγή', photograph: 'Φωτογραφία παραγωγής', hours: 'ώρ.', minutes: 'λεπ.'
  }
};

export const copy = (language = locale()) => dictionaries[language] || dictionaries.en;