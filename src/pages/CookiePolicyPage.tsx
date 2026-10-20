import { Link } from "react-router-dom"
import { usePageMeta } from "@/hooks/usePageMeta"
import { CursorGlow } from "@/components/motion/CursorGlow"
import { Footer } from "@/components/sections/Footer"
import { consentEnabled, openCookiePreferences } from "@/lib/consent"

/** Same placeholder marker as the Privacy Policy — see its TODO. */
function TODO({ children }: { children: string }) {
  return <mark className="legal-page__todo">{children}</mark>
}

export function CookiePolicyPage() {
  usePageMeta(
    "Informativa sui cookie — PixelWave",
    "Quali cookie usa PixelWave, a cosa servono e come cambiare la tua scelta."
  )

  return (
    <>
      <main className="legal-page" data-theme="dark" data-screen-label="Cookie Policy">
        <CursorGlow className="cursor-glow" variant="dark" glow={false} />
        <div className="wrap legal-page__content">
          <p className="legal-page__eyebrow">Note legali</p>
          <h1 className="legal-page__title">Informativa sui cookie</h1>
          <p className="legal-page__updated">
            Ultimo aggiornamento: <TODO>inserire la data quando la pagina sarà definitiva</TODO>
          </p>

          <p className="legal-page__notice">
            <strong>Questa pagina è una bozza.</strong> L’elenco dei cookie qui sotto deve
            corrispondere ai tag effettivamente configurati in Google Tag Manager: controllalo prima
            di pubblicare e fallo rivedere insieme all’informativa sulla privacy.
          </p>

          <h2>1. Cosa sono i cookie</h2>
          <p>
            I cookie sono piccoli file che un sito salva nel tuo browser. Alcuni servono al
            funzionamento del sito; altri misurano come viene usato o mostrano pubblicità.
          </p>

          <h2>2. Cosa usiamo</h2>
          <p>
            <strong>Necessari.</strong> Il sito non imposta cookie propri. Ricorda, solo per la durata
            della tua visita, che hai già visto l’animazione iniziale (nella session storage del tuo
            browser) e salva nel tuo browser la scelta che fai sui cookie qui sotto. Nessuno dei due
            ti traccia e nessuno richiede il consenso.
          </p>
          <p>
            <strong>Statistiche e marketing.</strong> Vengono usati{" "}
            <em>solo se li accetti</em>. Finché non lo fai, a Google o a Meta non viene richiesto
            nulla. Si caricano tramite Google Tag Manager:
          </p>
          <ul>
            <li>
              <strong>Google Analytics</strong> (statistiche) — <code>_ga</code> e <code>_ga_*</code>{" "}
              (fino a 2 anni), <code>_gid</code> (24 ore). Servono a contare le visite e a vedere
              quali pagine vengono viste.
            </li>
            <li>
              <strong>Google Ads</strong> (marketing) — <code>_gcl_*</code> (fino a 90 giorni).
              Servono a misurare i risultati della pubblicità.
            </li>
            <li>
              <strong>Pixel di Meta</strong> (marketing) — <code>_fbp</code> (fino a 90 giorni).
              Serve a misurare la pubblicità su Facebook e Instagram.
            </li>
          </ul>
          <p>
            <TODO>
              Tenere solo gli strumenti realmente configurati nel contenitore di Tag Manager e
              verificare le durate indicate sopra sulla documentazione attuale di ciascun fornitore.
            </TODO>
          </p>

          <h2>3. La tua scelta</h2>
          <p>
            Alla prima visita un banner ti permette di accettare tutto, rifiutare tutto o scegliere
            per categoria. Rifiutare è facile quanto accettare e il sito funziona allo stesso modo in
            entrambi i casi. Te lo chiediamo di nuovo dopo circa sei mesi.
          </p>
          {consentEnabled && (
            <p>
              <button type="button" className="legal-page__link-button" onClick={openCookiePreferences}>
                Cambia le tue preferenze sui cookie
              </button>
            </p>
          )}
          <p>
            Puoi anche eliminare i cookie dalle impostazioni del browser in qualsiasi momento. Se
            revochi il consenso dopo averlo dato, la pagina si ricarica e i cookie elencati sopra
            vengono rimossi.
          </p>

          <h2>4. Chi riceve i dati</h2>
          <p>
            Se accetti, i dati raccolti vengono trattati da Google (Analytics e Ads) e, per il pixel,
            da Meta, che potrebbero trasferirli fuori dall’Unione europea.{" "}
            <TODO>
              Confermare i termini di trattamento dei dati accettati con Google e Meta e le garanzie
              sui trasferimenti su cui si basano.
            </TODO>
          </p>
          <p>
            Per come trattiamo i dati che ci invii tramite i moduli, leggi l'
            <Link to="/privacy">informativa sulla privacy</Link>.
          </p>
        </div>
      </main>
      <Footer />
    </>
  )
}
