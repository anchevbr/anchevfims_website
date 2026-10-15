import { siteContent } from '../content.js';
import { locale } from './localization.js';

const greekLegal = {
  cookies: {
    kicker: 'Πολιτική cookies', title: 'Οι επιλογές σας<br><em>προηγούνται.</em>',
    sections: [
      { heading: 'Απαραίτητη αποθήκευση', body: 'Ο ιστότοπος αποθηκεύει τοπικά την επιλογή απορρήτου σας, ώστε να τη σέβεται στις επόμενες επισκέψεις. Η αποθήκευση αυτή εξυπηρετεί τις ρυθμίσεις συγκατάθεσης και δεν χρησιμοποιείται για διαφήμιση.' },
      { heading: 'Προαιρετική ανάλυση', body: 'Οι υπηρεσίες της Google φορτώνονται μόνο αφού επιλέξετε ανάλυση επισκεψιμότητας ή μέτρηση διαφήμισης. Η ανάλυση επιτρέπει τη μέτρηση χρήσης σελίδων και ενεργειών επικοινωνίας και μπορεί να περιλαμβάνει στοιχεία συσκευής, προγράμματος περιήγησης και κατά προσέγγιση τοποθεσίας.' },
      { heading: 'Μέτρηση διαφήμισης', body: 'Η μέτρηση διαφήμισης είναι απενεργοποιημένη από προεπιλογή. Αν ενεργοποιηθεί χωρίς συγκατάθεση για ανάλυση, η Google μπορεί να λαμβάνει σήματα ενεργειών επικοινωνίας χωρίς cookies ανάλυσης. Μια τέτοια ενέργεια δείχνει ενδιαφέρον, όχι επιβεβαιωμένο αίτημα παραγωγής.' },
      { heading: 'Οι επιλογές σας', body: 'Μπορείτε να απορρίψετε την προαιρετική αποθήκευση, να επιλέξετε χωριστά κάθε κατηγορία ή να αλλάξετε την απόφασή σας από τις Ρυθμίσεις cookies στο υποσέλιδο. Η απόρριψη δεν περιορίζει τη βασική πρόσβαση στον ιστότοπο.' }
    ]
  },
  terms: {
    kicker: 'Όροι χρήσης', title: 'Χρήση του<br><em>ιστοτόπου.</em>',
    sections: [
      { heading: 'Χρήση περιεχομένου', body: 'Το οπτικό και γραπτό υλικό και τα στοιχεία επωνυμίας παρουσιάζονται για ενημερωτικούς και προωθητικούς σκοπούς. Δεν επιτρέπεται η επαναχρησιμοποίησή τους χωρίς άδεια.' },
      { heading: 'Αιτήματα παραγωγής', body: 'Η υποβολή αιτήματος δεν δημιουργεί συμβατική σχέση. Κάθε συνεργασία παραγωγής επιβεβαιώνεται μόνο με γραπτή συμφωνία.' },
      { heading: 'Ενημερώσεις', body: 'Η Anchev Films μπορεί να ενημερώνει το περιεχόμενο, τα νομικά κείμενα και τις πληροφορίες υπηρεσιών χωρίς προηγούμενη ειδοποίηση.' }
    ]
  }
};

export const renderLegalPanelMarkup = (key, language = 'en') => {
  const legal = language === 'el' && greekLegal[key] ? greekLegal[key] : siteContent.legal[key];
  if (!legal) return '';
  return `
    <div class="ctp-header">
      <span class="ctp-eyebrow">${legal.kicker}</span>
      <span class="ctp-rule"></span>
    </div>
    <div class="ctp-hero">
      <h2 class="ctp-title">${legal.title}</h2>
    </div>
    <div class="ctp-divider"></div>
    <div class="legal-stack">
      ${legal.sections
        .map(
          (section) => `
            <section class="legal-section">
              <h3>${section.heading}</h3>
              <p>${section.body}</p>
            </section>
          `
        )
        .join('')}
    </div>
  `;
};

export const renderLegalPanel = (key) => {
  const root = document.getElementById(`panel-content-${key}`);
  if (root) root.innerHTML = renderLegalPanelMarkup(key, locale());
};
