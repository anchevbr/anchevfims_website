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
    start: 'Start a project / Athens to worldwide', contactTitle: "Have something in mind? Let's make it.",
    email: 'Email', phone: 'Telephone', worldwide: 'Available worldwide', name: 'Name', company: 'Company', message: 'Your production brief',
    inquiryTitle: 'Tell us about your next film.', send: 'Send inquiry', sending: 'Sending...',
    privacy: 'I agree to the processing of my details to respond to this inquiry.', privacyLink: 'Privacy notice',
    success: 'Your inquiry has been received. Thank you.', error: 'Your inquiry could not be sent. Try again or email us.',
    work: 'Selected work', viewFilm: 'View film', all: 'All projects', filter: 'Filter productions', search: 'Search productions',
    back: 'Back to work', brief: 'The brief', approach: 'Our approach', production: 'The production', film: 'The film',
    director: 'Director', producer: 'Producer', dop: 'Director of photography', location: 'Location', duration: 'Duration', services: 'Services', deliverables: 'Deliverables',
    behind: 'Behind the scenes', press: 'In the press', credits: 'Credits', next: 'More selected work', startProject: 'Start a project',
    play: 'Play', pause: 'Pause', episode: 'Episode', openEpisode: 'Open episode'
  },
  el: {
    start: 'Ξεκινήστε μια παραγωγή / Αθήνα και διεθνώς', contactTitle: 'Έχετε μια ιδέα; Ας της δώσουμε εικόνα.',
    email: 'Email', phone: 'Τηλέφωνο', worldwide: 'Παραγωγές στην Ελλάδα και διεθνώς', name: 'Ονοματεπώνυμο', company: 'Εταιρεία', message: 'Η παραγωγή που σχεδιάζετε',
    inquiryTitle: 'Ας μιλήσουμε για την επόμενη ταινία σας.', send: 'Αποστολή αιτήματος', sending: 'Αποστολή...',
    privacy: 'Συμφωνώ με την επεξεργασία των στοιχείων μου για την απάντηση στο αίτημά μου.', privacyLink: 'Πολιτική απορρήτου',
    success: 'Λάβαμε το αίτημά σας. Ευχαριστούμε.', error: 'Το αίτημα δεν στάλθηκε. Δοκιμάστε ξανά ή επικοινωνήστε με email.',
    work: 'Επιλεγμένες παραγωγές', viewFilm: 'Δείτε την ταινία', all: 'Όλες οι παραγωγές', filter: 'Κατηγορία παραγωγής', search: 'Αναζήτηση παραγωγών',
    back: 'Επιστροφή στις παραγωγές', brief: 'Το ζητούμενο', approach: 'Η προσέγγισή μας', production: 'Η παραγωγή', film: 'Η ταινία',
    director: 'Σκηνοθεσία', producer: 'Παραγωγή', dop: 'Διεύθυνση φωτογραφίας', location: 'Τοποθεσία', duration: 'Διάρκεια', services: 'Υπηρεσίες', deliverables: 'Παραδοτέα',
    behind: 'Πίσω από τις κάμερες', press: 'Στον Τύπο', credits: 'Συντελεστές', next: 'Περισσότερες παραγωγές', startProject: 'Συζητήστε την παραγωγή σας',
    play: 'Αναπαραγωγή', pause: 'Παύση', episode: 'Επεισόδιο', openEpisode: 'Άνοιγμα επεισοδίου'
  }
};

export const copy = (language = locale()) => dictionaries[language] || dictionaries.en;