import Logo from "../../img/chatbot.png";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__logo-box">
        <img src={Logo} alt="NutriRAG logo" className="footer__logo" />
      </div>
      <div className="row">
        <div className="col-1-of-2">
          <div className="footer__navigation">
            <ul className="footer_list">
              <li className="footer__item">
                <a href="/analysis" className="footer__link">
                  Analize Medicale
                </a>
              </li>
              <li className="footer__item">
                <a href="/menu" className="footer__link">
                  Plan Alimentar
                </a>
              </li>
              <li className="footer__item">
                <a href="/chat" className="footer__link">
                  Chat Nutrițional
                </a>
              </li>
              <li className="footer__item">
                <a
                  href="https://foodb.ca"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer__link"
                >
                  FooDB
                </a>
              </li>
              <li className="footer__item">
                <a
                  href="https://pubchem.ncbi.nlm.nih.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer__link"
                >
                  PubChem
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="col-1-of-2">
          <p className="footer__copyright">
            NutriRAG &copy; {new Date().getFullYear()} &mdash; Asistent inteligent de
            nutriție dezvoltat ca lucrare de disertație de{" "}
            <strong>Petcu Bogdan</strong>, Universitatea de Vest din Timișoara.
            Sistemul integrează FooDB, PubChem și ADMETLab&nbsp;3.0 într-o
            arhitectură RAG hibridă (dense + BM25) cu reranking cross-encoder
            pentru recomandări alimentare personalizate. Informațiile furnizate
            au scop educativ și nu înlocuiesc consultul medical.
          </p>
        </div>
      </div>
    </footer>
  );
}
