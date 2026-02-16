import { Instagram, Linkedin } from "lucide-react";
import logo from "@/assets/logo.svg";

const Footer = () => {
  return (
    <footer className="py-12 px-6 border-t border-border">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex items-center justify-center">
            <img src={logo} alt="Logo" className="h-10" />
          </div>

          {/* Redes Sociais */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
            <a
              href="https://www.instagram.com/grupoancoradouro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              aria-label="Instagram Grupo Ancora Douro"
            >
              <Instagram className="w-5 h-5" />
              <span className="text-sm">@grupoancoradouro</span>
            </a>
            
            <a
              href="https://www.instagram.com/mondialeturismo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              aria-label="Instagram Mondiale Turismo"
            >
              <Instagram className="w-5 h-5" />
              <span className="text-sm">@mondialeturismo</span>
            </a>
            
            <a
              href="https://www.linkedin.com/company/grupoancoradouro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
              aria-label="LinkedIn Grupo Ancora Douro"
            >
              <Linkedin className="w-5 h-5" />
              <span className="text-sm">grupoancoradouro</span>
            </a>
          </div>

          {/* Copyright */}
          <p className="text-muted-foreground text-sm">
            © 2026 Travel Collection. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
