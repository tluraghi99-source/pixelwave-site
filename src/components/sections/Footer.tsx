import { ArrowUp } from "lucide-react"
import { BrandLogo } from "@/components/pw/Logo"
import { Reveal, RevealGroup, RevealItem } from "@/components/motion/Reveal"

export function Footer() {
  return (
    <footer data-theme="dark" data-screen-label="Footer">
      <div className="wrap">
        <div className="foot__top">
          <Reveal className="foot__brand">
            <BrandLogo height={30} />
            <p className="secbody" style={{ marginTop: "1.25rem" }}>
              Your Vision, Our Wave.
            </p>
          </Reveal>
          <RevealGroup className="foot__cols" stagger={0.08}>
            <RevealItem className="foot__col">
              <h4>Studio</h4>
              <a href="#work">Work</a>
              <a href="#services">Services</a>
              <a href="#studio">About</a>
            </RevealItem>
            <RevealItem className="foot__col">
              <h4>Connect</h4>
              <a href="#contact">Contact</a>
              <a href="#">Instagram</a>
              <a href="#">LinkedIn</a>
            </RevealItem>
            <RevealItem className="foot__col">
              <h4>Say hi</h4>
              <a href="mailto:hello@pixellwave.studio">hello@pixellwave.studio</a>
            </RevealItem>
          </RevealGroup>
        </div>
        <div className="foot__bottom">
          <span>&copy; 2026 PixellWave. All rights reserved.</span>
          <a className="foot__totop" href="#top">
            Back to top <ArrowUp size={14} />
          </a>
        </div>
      </div>
    </footer>
  )
}
