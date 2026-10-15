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
      summary: 'Company stories, people and messages with purpose.',
      capabilities: ['Company profile films', 'Leadership interviews', 'Customer testimonials', 'Recruitment films', 'Internal communications', 'Training videos'],
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
      summary: 'Η εταιρεία, οι άνθρωποι και το μήνυμά σας με σαφήνεια.',
      capabilities: ['Ταινίες εταιρικής παρουσίασης', 'Συνεντεύξεις στελεχών', 'Μαρτυρίες πελατών', 'Βίντεο προσέλκυσης προσωπικού', 'Εσωτερική επικοινωνία', 'Εκπαιδευτικά βίντεο'],
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
      summary: 'Local knowledge. A workable production plan.',
      capabilities: ['Location scouting', 'Production coordination', 'Local crew', 'Equipment planning', 'Casting support', 'On-set logistics'],
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
      summary: 'Τοπική γνώση. Ένα εφαρμόσιμο πλάνο παραγωγής.',
      capabilities: ['Αναζήτηση τοποθεσιών', 'Συντονισμός παραγωγής', 'Τοπικά συνεργεία', 'Σχεδιασμός εξοπλισμού', 'Υποστήριξη casting', 'Οργάνωση γυρισμάτων'],
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

services.push(
  {
    slug: 'commercial-production', heroImage: '/media/studio/studio-frame-01.jpg',
    related: ['branded-content', 'post-production', 'photography'],
    en: {
      title: 'Commercial Production', summary: 'Campaigns made for the screen they live on.',
      description: 'Commercial production in Athens and Greece. Television spots, digital advertising and product films, from creative development to finished campaign assets.',
      intro: 'A commercial has a short time to earn attention. We build the film around a clear idea, a precise visual language and the places your campaign will appear.',
      capabilities: ['Television commercials', 'Digital advertising', 'Product films', 'Cinematic brand films', 'Social advertising', 'Commercial cinematography'],
      sections: [
        ['A campaign, not just a shoot', 'We start with the audience, campaign objective and media plan. Treatments, scripts and visual references establish the tone before crew, locations and equipment are selected. A television spot and a vertical social edit should be planned together, not forced into the same frame afterward.'],
        ['Creative intent on a working set', 'Pre-production connects the treatment to a realistic budget and schedule. We coordinate casting, locations, art direction, cinematography and production logistics around the agreed scope, keeping agencies and brand teams close to the decisions that affect the film.'],
        ['Built for release', 'Editing, colour, sound and finishing carry the idea through to the final master. We agree durations, aspect ratios, subtitles and delivery specifications before filming, with review stages that give your team a clear route to approval.']
      ],
      brief: 'Share your campaign brief, audience, agency involvement, reference films, intended platforms and release date. A budget range and required versions help us shape a production that fits the campaign.'
    },
    el: {
      title: 'Παραγωγή διαφημιστικών', summary: 'Καμπάνιες για κάθε οθόνη και κοινό.',
      description: 'Παραγωγή διαφημιστικών στην Αθήνα και την Ελλάδα. Τηλεοπτικά spots, ψηφιακές καμπάνιες και ταινίες προϊόντων από τη δημιουργική ιδέα έως την παράδοση.',
      intro: 'Ένα διαφημιστικό έχει λίγο χρόνο για να κερδίσει την προσοχή. Σχεδιάζουμε την ταινία γύρω από μια σαφή ιδέα, συγκεκριμένη οπτική γλώσσα και τα κανάλια της καμπάνιας.',
      capabilities: ['Τηλεοπτικά διαφημιστικά', 'Ψηφιακές καμπάνιες', 'Ταινίες προϊόντων', 'Ταινίες εταιρικής ταυτότητας', 'Διαφήμιση στα κοινωνικά δίκτυα', 'Κινηματογράφηση διαφημιστικών'],
      sections: [
        ['Σχεδιασμός για ολόκληρη την καμπάνια', 'Ξεκινάμε με το κοινό, τον επικοινωνιακό στόχο και το πλάνο προβολής. Treatment, σενάριο και οπτικές αναφορές ορίζουν το ύφος πριν επιλεγούν συνεργείο, χώροι και εξοπλισμός. Οι τηλεοπτικές και κάθετες εκδοχές σχεδιάζονται μαζί από την αρχή.'],
        ['Η δημιουργική ιδέα στο γύρισμα', 'Η προετοιμασία συνδέει το treatment με τον προϋπολογισμό και το χρονοδιάγραμμα. Οργανώνουμε casting, τοποθεσίες, εικαστική κατεύθυνση και κινηματογράφηση, με τις ομάδες του brand και του agency κοντά στις κρίσιμες αποφάσεις.'],
        ['Έτοιμο για προβολή', 'Μοντάζ, χρώμα, ήχος και τελικό φινίρισμα διατηρούν την ιδέα μέχρι την τελική έκδοση. Διάρκειες, αναλογίες εικόνας, υπότιτλοι και προδιαγραφές παράδοσης συμφωνούνται πριν από τα γυρίσματα, μαζί με τα στάδια εγκρίσεων.']
      ],
      brief: 'Στείλτε το brief, το κοινό, τις ομάδες που συμμετέχουν, ταινίες αναφοράς, κανάλια προβολής και ημερομηνία κυκλοφορίας. Ένας ενδεικτικός προϋπολογισμός βοηθά στον σωστό σχεδιασμό.'
    }
  },
  {
    slug: 'branded-content', heroImage: '/media/studio/studio-frame-02.jpg', related: ['commercial-production', 'film-documentary-production', 'post-production'],
    en: {
      title: 'Branded Content', summary: 'The story behind the brand, not another interruption.',
      description: 'Branded content production in Athens: brand stories, social films, digital campaigns and documentary-led content shaped around a real audience.',
      intro: 'The most useful brand stories give people a reason to stay. We develop films around an original perspective, the people behind a brand and the audience you want to reach.',
      capabilities: ['Brand storytelling', 'Digital campaigns', 'Social media films', 'Branded documentaries', 'Lifestyle production', 'Product storytelling'],
      sections: [
        ['Find the story worth telling', 'A brand film can follow a person, a process or a question. We look for the subject with genuine substance, then choose an editorial or cinematic approach that suits it. Clear communication objectives sit behind the story without replacing it.'],
        ['Plan a body of content', 'A main film, short edits, interviews and platform-specific material can come from one considered production. We plan the coverage and formats early, so each output has a purpose rather than becoming another version of the same cut.'],
        ['Keep the voice consistent', 'The edit, music, graphics, colour and subtitles should belong to the same world. We organise review and delivery around the agreed brand guidelines, with an appropriate balance between a recognisable identity and the film\'s own character.']
      ],
      brief: 'Tell us about the brand, the audience, the subjects you can give us access to and how the films will be used. Include any existing campaign direction and the formats you need.'
    },
    el: {
      title: 'Περιεχόμενο για brands', summary: 'Ιστορίες που δίνουν λόγο στο κοινό να μείνει.',
      description: 'Παραγωγή branded content στην Αθήνα. Ιστορίες εταιρικής ταυτότητας, βίντεο για κοινωνικά δίκτυα και περιεχόμενο με προσέγγιση ντοκιμαντέρ.',
      intro: 'Μια ιστορία για ένα brand χρειάζεται κάτι ουσιαστικό να πει. Αναπτύσσουμε ταινίες γύρω από μια δημιουργική οπτική, πραγματικούς ανθρώπους και το κοινό που θέλετε να προσεγγίσετε.',
      capabilities: ['Αφήγηση εταιρικής ταυτότητας', 'Ψηφιακές καμπάνιες', 'Βίντεο για κοινωνικά δίκτυα', 'Branded ντοκιμαντέρ', 'Lifestyle παραγωγές', 'Ιστορίες προϊόντων'],
      sections: [
        ['Η ιστορία πριν από τη μορφή', 'Ένα πρόσωπο, μια διαδικασία ή ένα ερώτημα μπορεί να αποτελέσει την αφετηρία. Αναζητούμε το ουσιαστικό θέμα και επιλέγουμε την κατάλληλη αφηγηματική ή κινηματογραφική προσέγγιση, με σαφή στόχο επικοινωνίας.'],
        ['Ένα οργανωμένο σύνολο περιεχομένου', 'Κεντρική ταινία, σύντομα βίντεο, συνεντεύξεις και υλικό για διαφορετικές πλατφόρμες μπορούν να προκύψουν από μία προσεκτικά σχεδιασμένη παραγωγή. Οι ανάγκες λήψεων και οι μορφές συμφωνούνται νωρίς.'],
        ['Συνεπής δημιουργική φωνή', 'Μοντάζ, μουσική, γραφικά, χρώμα και υπότιτλοι χρειάζεται να ανήκουν στον ίδιο κόσμο. Η διαδικασία εγκρίσεων ακολουθεί τις οδηγίες του brand, διατηρώντας τον χαρακτήρα της ταινίας.']
      ],
      brief: 'Μιλήστε μας για το brand, το κοινό, τα θέματα και τους ανθρώπους στους οποίους υπάρχει πρόσβαση. Προσθέστε την κατεύθυνση της καμπάνιας και τις μορφές που χρειάζεστε.'
    }
  },
  {
    slug: 'film-documentary-production', heroImage: '/media/projects/anti-bullying/photos59.webp', heroAlt: 'On the set of Speak Up. Take Action.', hasProductionExample: true,
    related: ['production-services-greece', 'post-production', 'branded-content'],
    en: {
      title: 'Film & Documentary Production', summary: 'A point of view. A story with something at stake.',
      description: 'Independent film and documentary production in Athens, Greece. Creative development, cinematography, production planning and complete post-production.',
      intro: 'Narrative films and documentaries begin with a reason to look closer. We bring creative development and practical production together, with attention to the people and places at the centre of the story.',
      capabilities: ['Narrative short films', 'Documentary production', 'Creative development', 'Cinematography', 'Independent production', 'Production support'],
      sections: [
        ['Develop the perspective', 'Research, access and a clear treatment help define the film before filming begins. For scripted work, that means developing the script and visual approach. For documentaries, it means understanding the subject and planning space for what cannot be scripted.'],
        ['Make the production possible', 'We scope crew, locations, equipment, schedules and responsibilities around the story. Permissions and contributor arrangements are addressed for the specific production. Cinematography and sound are planned together so the material can carry a coherent film.'],
        ['Find the film in the material', 'The edit gives the story its rhythm and point of view. Colour, sound design, finishing and subtitles support the film without overwhelming it. The intended screenings, platforms and delivery requirements guide the final versions.']
      ],
      brief: 'Share a synopsis or treatment, the current development stage, subject access, intended audience and any existing material. Include your schedule and the support you are seeking.'
    },
    el: {
      title: 'Ταινίες και ντοκιμαντέρ', summary: 'Μια οπτική γωνία. Μια ιστορία με ουσία.',
      description: 'Παραγωγή ανεξάρτητων ταινιών και ντοκιμαντέρ στην Αθήνα. Δημιουργική ανάπτυξη, κινηματογράφηση, οργάνωση γυρισμάτων και ολοκληρωμένο post-production.',
      intro: 'Η μυθοπλασία και το ντοκιμαντέρ ξεκινούν από έναν λόγο να κοιτάξουμε πιο προσεκτικά. Συνδυάζουμε τη δημιουργική ανάπτυξη με την παραγωγή, με σεβασμό στους ανθρώπους και τους χώρους της ιστορίας.',
      capabilities: ['Ταινίες μικρού μήκους', 'Παραγωγή ντοκιμαντέρ', 'Δημιουργική ανάπτυξη', 'Διεύθυνση φωτογραφίας', 'Ανεξάρτητη παραγωγή', 'Υποστήριξη γυρισμάτων'],
      sections: [
        ['Η οπτική της ταινίας', 'Έρευνα, πρόσβαση και ένα σαφές treatment ορίζουν την ταινία πριν από το γύρισμα. Στη μυθοπλασία δουλεύουμε το σενάριο και την οπτική προσέγγιση. Στο ντοκιμαντέρ αφήνουμε χώρο για όσα δεν μπορούν να γραφτούν εκ των προτέρων.'],
        ['Από την ιδέα στην παραγωγή', 'Συνεργείο, τοποθεσίες, εξοπλισμός και χρονοδιάγραμμα σχεδιάζονται γύρω από την ιστορία. Άδειες και συμφωνίες συμμετοχής εξετάζονται για κάθε έργο. Εικόνα και ήχος οργανώνονται ως ενιαίο σύνολο.'],
        ['Η ιστορία στο μοντάζ', 'Το μοντάζ δίνει ρυθμό και κατεύθυνση στο υλικό. Χρώμα, σχεδιασμός ήχου, φινίρισμα και υπότιτλοι ολοκληρώνουν την ταινία με βάση τις προβολές, τις πλατφόρμες και τις ανάγκες παράδοσης.']
      ],
      brief: 'Στείλτε σύνοψη ή treatment, στάδιο ανάπτυξης, διαθέσιμη πρόσβαση στο θέμα και υπάρχον υλικό. Περιγράψτε το χρονοδιάγραμμα και την υποστήριξη που αναζητάτε.'
    }
  },
  {
    slug: 'event-video-production', heroImage: '/media/studio/studio-frame-03.jpg', related: ['live-streaming-athens', 'corporate-video-production', 'photography'],
    en: {
      title: 'Events & Live Production', summary: 'One live moment. A carefully planned production.',
      description: 'Event video production in Athens: conferences, concerts, corporate events, multi-camera filming and highlight films. Plan live coverage with Anchev Films.',
      intro: 'An event cannot wait for a second take. We plan coverage around the running order, the audience and the moments that need to survive beyond the room.',
      capabilities: ['Conference filming', 'Corporate events', 'Concert coverage', 'Multi-camera production', 'Hybrid events', 'Event aftermovies'],
      sections: [
        ['Know the programme', 'We review the running order, key participants, stage layout, access and lighting with the event team. Camera positions, interview opportunities and audio feeds are agreed before the audience arrives.'],
        ['Separate recording from live output', 'An archive recording, a highlight film and a live stream serve different needs. We define the outputs, crew responsibilities and technical requirements for each. Live connectivity and platform settings are reviewed and tested before confirmation.'],
        ['Give the event a second life', 'Edited highlights, speaker segments and social versions can extend the value of the event. We agree the priority moments, turnaround, approvals and distribution formats before filming, so the edit is planned rather than improvised.']
      ],
      brief: 'Send the date, venue, running order, number of stages and expected duration. Tell us whether you need recordings, highlights, interviews, a live stream or a combination.'
    },
    el: {
      title: 'Εκδηλώσεις και ζωντανές παραγωγές', summary: 'Μια ζωντανή στιγμή. Μια προσεκτικά οργανωμένη παραγωγή.',
      description: 'Βιντεοσκόπηση εκδηλώσεων στην Αθήνα. Συνέδρια, συναυλίες, εταιρικές εκδηλώσεις, πολυκάμερη κάλυψη και βίντεο στιγμιοτύπων από την Anchev Films.',
      intro: 'Μια εκδήλωση δεν περιμένει δεύτερη λήψη. Οργανώνουμε την κάλυψη γύρω από το πρόγραμμα, το κοινό και τις στιγμές που αξίζει να μείνουν πέρα από την αίθουσα.',
      capabilities: ['Βιντεοσκόπηση συνεδρίων', 'Εταιρικές εκδηλώσεις', 'Κάλυψη συναυλιών', 'Πολυκάμερη παραγωγή', 'Υβριδικές εκδηλώσεις', 'Βίντεο στιγμιοτύπων'],
      sections: [
        ['Γνωρίζουμε το πρόγραμμα', 'Εξετάζουμε τη ροή, τους ομιλητές, τη σκηνή, την πρόσβαση και τον φωτισμό με την ομάδα της εκδήλωσης. Θέσεις καμερών, συνεντεύξεις και πηγές ήχου συμφωνούνται πριν φτάσει το κοινό.'],
        ['Καταγραφή και ζωντανή μετάδοση', 'Η πλήρης εγγραφή, το σύντομο βίντεο και το live stream έχουν διαφορετικές απαιτήσεις. Ορίζουμε παραδοτέα, αρμοδιότητες και τεχνικές ανάγκες. Σύνδεση και ρυθμίσεις πλατφόρμας ελέγχονται πριν επιβεβαιωθεί μια ζωντανή παραγωγή.'],
        ['Η εκδήλωση συνεχίζει να επικοινωνεί', 'Στιγμιότυπα, αποσπάσματα ομιλιών και εκδοχές για κοινωνικά δίκτυα δίνουν συνέχεια στην εκδήλωση. Προτεραιότητες, χρόνος παράδοσης, εγκρίσεις και μορφές συμφωνούνται πριν από το γύρισμα.']
      ],
      brief: 'Στείλτε ημερομηνία, χώρο, πρόγραμμα, αριθμό σκηνών και διάρκεια. Πείτε μας αν χρειάζεστε εγγραφή, στιγμιότυπα, συνεντεύξεις, live stream ή συνδυασμό τους.'
    }
  },
  {
    slug: 'post-production', heroImage: '/media/projects/anti-bullying/cover.webp', heroAlt: 'A frame from Speak Up. Take Action.', hasProductionExample: true,
    related: ['film-documentary-production', 'commercial-production', 'branded-content'],
    en: {
      title: 'Post-Production', summary: 'Find the rhythm. Finish every detail.',
      description: 'Post-production in Athens: video editing, colour grading, sound design, motion graphics, finishing, subtitles and delivery for films and campaigns.',
      intro: 'Post-production is where the material becomes the film. We work with the story, rhythm, colour and sound as one experience, with a clear path from first cut to final delivery.',
      capabilities: ['Video editing', 'Colour grading', 'Motion graphics & VFX', 'Sound design', 'Finishing', 'Subtitles & localisation'],
      sections: [
        ['Start with the material', 'We review the footage, sound, brief and intended outputs before defining the edit. For existing productions, share the camera formats, project files, references and any missing elements. An organised handover protects both the schedule and the material.'],
        ['Shape the film, then refine it', 'Editorial decisions establish structure and pace. Colour grading, sound design, graphics and visual effects are scoped around the film\'s needs. We agree review rounds and approval responsibilities so feedback stays clear and actionable.'],
        ['Finish for the destination', 'Masters, aspect ratios, cutdowns, subtitles and language versions follow the agreed release plan. Technical specifications are confirmed for the destination rather than assumed, and the final handover is organised around the files your team actually needs.']
      ],
      brief: 'Send the brief, footage or project details, reference films, delivery deadline and required formats. Let us know which stages are already complete and what needs editing, finishing or adaptation.'
    },
    el: {
      title: 'Post-production', summary: 'Ο ρυθμός της ιστορίας. Η λεπτομέρεια της τελικής εικόνας.',
      description: 'Post-production στην Αθήνα. Μοντάζ, χρωματική επεξεργασία, σχεδιασμός ήχου, motion graphics, τελικό φινίρισμα, υπότιτλοι και εκδόσεις παράδοσης.',
      intro: 'Στο post-production το υλικό γίνεται ταινία. Δουλεύουμε ιστορία, ρυθμό, χρώμα και ήχο ως ενιαία εμπειρία, από το πρώτο μοντάζ έως την τελική παράδοση.',
      capabilities: ['Μοντάζ', 'Χρωματική επεξεργασία', 'Motion graphics και VFX', 'Σχεδιασμός ήχου', 'Τελικό φινίρισμα', 'Υπότιτλοι και γλωσσική προσαρμογή'],
      sections: [
        ['Ξεκινάμε από το υλικό', 'Εξετάζουμε εικόνα, ήχο, brief και παραδοτέα πριν ορίσουμε τη διαδικασία. Για υπάρχουσες παραγωγές χρειαζόμαστε μορφές λήψης, αρχεία έργου, αναφορές και εκκρεμότητες. Η οργανωμένη μεταφορά προστατεύει υλικό και χρονοδιάγραμμα.'],
        ['Δομή και επεξεργασία', 'Το μοντάζ ορίζει τη δομή και τον ρυθμό. Χρώμα, ήχος, γραφικά και οπτικά εφέ σχεδιάζονται με βάση τις ανάγκες της ταινίας. Συμφωνούμε γύρους ελέγχου και υπευθύνους εγκρίσεων ώστε τα σχόλια να παραμένουν σαφή.'],
        ['Παράδοση για τον προορισμό', 'Τελικά αρχεία, αναλογίες εικόνας, σύντομες εκδοχές και υπότιτλοι ακολουθούν το πλάνο προβολής. Οι τεχνικές προδιαγραφές επιβεβαιώνονται για κάθε προορισμό και η παράδοση οργανώνεται γύρω από τα αρχεία που χρειάζεται η ομάδα σας.']
      ],
      brief: 'Στείλτε brief, πληροφορίες υλικού, ταινίες αναφοράς, προθεσμία και μορφές παράδοσης. Διευκρινίστε ποια στάδια έχουν ολοκληρωθεί και τι χρειάζεται επεξεργασία ή προσαρμογή.'
    }
  },
  {
    slug: 'photography', heroImage: '/media/studio/studio-frame-02.jpg', related: ['commercial-production', 'branded-content', 'corporate-video-production'],
    en: {
      title: 'Photography', summary: 'Still images, with the same attention to the frame.',
      description: 'Commercial, corporate, product and event photography in Athens. Plan campaign stills and photography alongside your film production with Anchev Films.',
      intro: 'A still image has its own job to do. We plan photography around the subject, the visual identity and the places the images will be used, whether as a dedicated shoot or alongside a film.',
      capabilities: ['Commercial photography', 'Corporate portraits', 'Product photography', 'Event photography', 'Campaign stills', 'Production photography'],
      sections: [
        ['Define the image requirements', 'The shot list begins with use: a website, a campaign, press material, social publishing or an internal library. We agree subjects, framing, backgrounds and the required crops, so the photographs can work across their intended placements.'],
        ['Give stills their own production plan', 'Portraits, products and events need different lighting, timing and access. When photography accompanies a film shoot, we plan dedicated time and responsibilities rather than assuming stills can happen between takes. Studio and location requirements are reviewed with the brief.'],
        ['Select and deliver a coherent set', 'Selection, retouching and output formats are agreed as part of the scope. We define image quantities, review stages, delivery sizes and usage arrangements before the shoot, with attention to consistency across the final collection.']
      ],
      brief: 'Tell us the subjects, intended use, approximate number of final images, visual references, location and deadline. Include any need to coordinate photography with a film or event production.'
    },
    el: {
      title: 'Φωτογραφία', summary: 'Σταθερές εικόνες, με την ίδια προσοχή στο κάδρο.',
      description: 'Διαφημιστική, εταιρική φωτογραφία, προϊόντα και εκδηλώσεις στην Αθήνα. Φωτογραφικές παραγωγές και υλικό καμπάνιας από την Anchev Films.',
      intro: 'Μια φωτογραφία έχει τον δικό της ρόλο. Σχεδιάζουμε τη λήψη γύρω από το θέμα, την οπτική ταυτότητα και τη χρήση της εικόνας, αυτόνομα ή μαζί με μια κινηματογραφική παραγωγή.',
      capabilities: ['Διαφημιστική φωτογραφία', 'Εταιρικά πορτρέτα', 'Φωτογραφία προϊόντων', 'Φωτογραφία εκδηλώσεων', 'Φωτογραφίες καμπάνιας', 'Φωτογραφία παραγωγής'],
      sections: [
        ['Οι ανάγκες της εικόνας', 'Ξεκινάμε με τη χρήση: ιστοσελίδα, καμπάνια, υλικό Τύπου, κοινωνικά δίκτυα ή εταιρικό αρχείο. Συμφωνούμε θέματα, κάδρα, φόντα και αναλογίες ώστε οι φωτογραφίες να ανταποκρίνονται στις θέσεις προβολής τους.'],
        ['Ξεχωριστός σχεδιασμός λήψεων', 'Πορτρέτα, προϊόντα και εκδηλώσεις χρειάζονται διαφορετικό φωτισμό, χρόνο και πρόσβαση. Όταν συνδυάζονται φωτογραφία και βίντεο, ορίζουμε χρόνο και αρμοδιότητες. Οι ανάγκες στούντιο και τοποθεσίας εξετάζονται με βάση το brief.'],
        ['Ένα συνεκτικό τελικό σύνολο', 'Επιλογή, ρετούς και μορφές αρχείων συμφωνούνται στο εύρος της συνεργασίας. Πλήθος εικόνων, στάδια ελέγχου, μεγέθη παράδοσης και δικαιώματα χρήσης ορίζονται πριν από τη λήψη.']
      ],
      brief: 'Περιγράψτε θέματα, χρήση, πλήθος τελικών εικόνων, οπτικές αναφορές, τοποθεσία και προθεσμία. Αναφέρετε αν η φωτογράφιση χρειάζεται να συνδυαστεί με βίντεο ή εκδήλωση.'
    }
  }
);
const serviceOrder = ['commercial-production', 'branded-content', 'corporate-video-production', 'film-documentary-production', 'event-video-production', 'production-services-greece', 'post-production', 'photography', 'video-production-athens', 'live-streaming-athens'];
services.sort((first, second) => serviceOrder.indexOf(first.slug) - serviceOrder.indexOf(second.slug));
for (const service of services) {
  if (['video-production-athens', 'live-streaming-athens'].includes(service.slug)) service.legacy = true;
}

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
  if (id.startsWith('news-')) return `${prefix}/news/${id.slice(5)}`;
  if (id === 'studio') return `${prefix}/studio`;
  if (id === 'contact' || id === 'about') return `${prefix}/${id}`;
  const service = services.find((entry) => id === `service-${entry.slug}`);
  return service ? `${prefix}/services/${service.slug}` : null;
};
export const getServicePath = (page, language = 'en') => `${language === 'el' ? '/el' : ''}${page.isStudio ? '/studio' : `/services/${page.slug}`}`;
export const getServicePage = (pathname, managed = null) => {
  const page = [...services, studio].find((entry) => getServicePath(entry, 'en') === pathname || getServicePath(entry, 'el') === pathname);
  if (!page || !managed) return page;
  const language = pathname.startsWith('/el/') ? 'el' : 'en';
  const hero = managed.blocks.find((block) => block.type === 'image');
  return { ...page, heroImage: hero?.url || page.heroImage, heroAlt: hero?.alt || page.heroAlt,
    mediaBlocks: managed.blocks.filter((block) => block.type !== 'text' && block.type !== 'fact' && block !== hero),
    seo: managed.seo,
    [language]: { ...page[language], title: managed.heading, intro: managed.intro,
      capabilities: managed.blocks.some((block) => block.type === 'fact') ? managed.blocks.filter((block) => block.type === 'fact').map((block) => block.text) : page[language].capabilities,
      description: managed.seo?.description || managed.intro,
      sections: managed.blocks.filter((block) => block.type === 'text').map((block) => [block.title, block.text]),
      brief: managed.body } };
};
export const getLanguageAlternates = (page) => ['en', 'el'].map((language) => ({ language, path: getServicePath(page, language) }));

export const renderServiceLinks = (language = 'en', currentSlug = '') => {
  const related = services.find((entry) => entry.slug === currentSlug)?.related;
  return services.filter((page) => page.slug !== currentSlug && (!related || related.includes(page.slug))).slice(0, 4)
    .map((page) => `<a class="case-study__external" href="${getServicePath(page, language)}">${escapeHtml(page[language].title)}</a>`).join('');
};

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
          ${copy.capabilities?.length ? `<section class="service-capabilities"><h2>${greek ? 'Δυνατότητες παραγωγής' : 'Production capabilities'}</h2><ul>${copy.capabilities.map((capability) => `<li>${escapeHtml(capability)}</li>`).join('')}</ul></section>` : ''}
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