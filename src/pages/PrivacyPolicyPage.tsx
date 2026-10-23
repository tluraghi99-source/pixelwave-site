import { Link } from "react-router-dom"
import { usePageMeta } from "@/hooks/usePageMeta"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { Footer } from "@/components/sections/Footer"
import { ROUTES } from "@/lib/routes"

/** GDPR-driven — see the Contact and Careers forms' consent checkbox,
 *  which links here. This is a first draft built from what the codebase
 *  actually does (the real form fields, the real processors it calls), not
 *  a generic template — but it still needs a real person (ideally a lawyer)
 *  to fill in the placeholders and sign off before publishing, the same way
 *  no other legal document on a real business gets shipped from a first
 *  draft alone. Written in Italian. */
export function PrivacyPolicyPage() {
  usePageMeta(
    "Informativa sulla privacy — PixelWave",
    "Come PixelWave raccoglie, usa e protegge i dati personali inviati tramite questo sito."
  )

  return (
    <>
      <main className="legal-page" data-theme="dark" data-screen-label="Privacy Policy">
        <CursorGlow className="cursor-glow" variant="dark" glow={false} />
        <div className="wrap legal-page__content">
          <p className="legal-page__eyebrow">Note legali</p>
          <h1 className="legal-page__title">Informativa sulla privacy</h1>
          <p className="legal-page__updated">
            Ultimo aggiornamento: 23 ottobre 2026
          </p>

          <h2>1. Chi siamo</h2>
          <p>
            PixelWave è uno studio creativo con sede a{" "}
            <a href="https://maps.app.goo.gl/xNz7W3z1U6EcBg6f7" target="_blank" rel="noopener noreferrer">
              Milano
            </a>
            . Ai sensi del GDPR, PixelWave è il titolare del trattamento dei dati personali descritti
            qui sotto.
          </p>
          <p>
            Titolare del trattamento: <strong>PIXEL WAVE S.r.l.</strong>, sede legale in Via Pietro
            Tamburini 6, sede operativa in Via G. Mussi 15, 20154 Milano, partita IVA 12315400965,
            PEC <a href="mailto:pixelwave@legalmail.it">pixelwave@legalmail.it</a>.
          </p>

          <h2>2. Quali dati raccogliamo</h2>
          <p>Raccogliamo solo ciò che ciascun modulo di questo sito richiede:</p>
          <ul>
            <li>
              <strong>Modulo contatti</strong> (/contatti) — il tuo nome, l’indirizzo email, il
              numero di telefono (facoltativo), i tipi di progetto e i tempi che selezioni.
            </li>
            <li>
              <strong>Modulo candidature</strong> (/lavora-con-noi) — il tuo nome, cognome, indirizzo
              email, numero di telefono, il ruolo per cui ti candidi e il file del CV che carichi. Il
              CV ci arriva per email e, una volta inviata l’email, non viene conservato sui nostri
              server.
            </li>
          </ul>
          <p>
            I cookie di statistica e di pubblicità (Google Analytics, Google Ads, pixel di Meta)
            vengono usati solo se li accetti nel banner dei cookie; finché non lo fai, a quei servizi
            non viene richiesto nulla. Leggi l'<Link to={ROUTES.cookies}>informativa sui cookie</Link> per i
            dettagli e per cambiare la tua scelta.
          </p>

          <h2>3. Perché li raccogliamo e su quale base</h2>
          <p>
            Usiamo questi dati esclusivamente per rispondere alla tua richiesta o per valutare la tua
            candidatura: nulla viene usato per il marketing e nulla viene venduto o condiviso con
            inserzionisti. La base giuridica è il tuo consenso, espresso con la casella presente su
            ogni modulo e, solo per il modulo candidature, l’esecuzione di misure precontrattuali
            adottate su tua richiesta, se la tua candidatura va avanti.
          </p>

          <h2>4. Per quanto tempo li conserviamo</h2>
          <p>
            I CV caricati tramite il modulo candidature vengono eliminati dal nostro server non
            appena ci sono stati inviati per email; restano solo nella nostra casella di posta.
          </p>
          <p>
            Gli altri dati inviati tramite i moduli (contatti e candidature) li conserviamo per 12
            mesi dall’ultimo contatto con te, salvo l’avvio di un rapporto di lavoro o di
            collaborazione; trascorso questo periodo vengono eliminati.
          </p>

          <h2>5. Chi tratta i dati</h2>
          <p>I tuoi dati sono gestiti, per nostro conto, da questi servizi:</p>
          <ul>
            <li>
              <strong>Strapi CMS</strong>, dove sono salvate le richieste inviate dai moduli,
              ospitato su server di Server Plan S.r.l. in Italia.
            </li>
            <li>
              <strong>Google Workspace / Gmail</strong>, usato per inviarci una notifica via email
              quando viene compilato un modulo.
            </li>
            <li>
              <strong>Google (Tag Manager, Analytics, Ads)</strong> e <strong>Meta (pixel)</strong>,
              per le statistiche e la misurazione della pubblicità — solo se accetti i cookie
              corrispondenti.
            </li>
          </ul>

          <h2>6. I tuoi diritti</h2>
          <p>Ai sensi del GDPR hai il diritto di:</p>
          <ul>
            <li>Accedere ai dati personali che conserviamo su di te</li>
            <li>Correggerli se sono inesatti</li>
            <li>Chiederne la cancellazione</li>
            <li>Limitarne il trattamento o opporti</li>
            <li>Riceverne una copia in un formato portabile</li>
            <li>
              Revocare il consenso in qualsiasi momento, senza effetti sui trattamenti già effettuati
            </li>
            <li>
              Presentare reclamo al Garante per la protezione dei dati personali (l’autorità di
              controllo italiana) o all’autorità del tuo paese
            </li>
          </ul>
          <p>
            Per esercitare questi diritti scrivici a{" "}
            <a href="mailto:info@pixelwave.it">info@pixelwave.it</a>.
          </p>

          <h2>7. Modifiche a questa informativa</h2>
          <p>
            Se questa informativa cambia in modo da incidere sul trattamento dei tuoi dati,
            aggiorneremo la data in cima a questa pagina.
          </p>

          <p className="legal-page__back">
            <Link to={ROUTES.contact}>← Torna a Contatti</Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
