import { IconContext } from "react-icons";
import { GiMeal } from "react-icons/gi";
import { FaMicroscope } from "react-icons/fa";
import { IoChatbubblesOutline } from "react-icons/io5";
import { TbSalad } from "react-icons/tb";

export default function SectionFeature() {
  return (
    <section className="section-features">
      <div className="row">
        <div className="col-1-of-4">
          <div className="feature-box">
            <IconContext.Provider value={{ className: "feature-box__icon" }}>
              <FaMicroscope />
            </IconContext.Provider>
            <h3 className="heading-tertiary">Analize medicale personalizate</h3>
            <p className="feature-box__text">
              Introdu rezultatele analizelor tale (glicemie, colesterol, vitamina D,
              fier, hemoglobină etc.) manual sau prin import PDF și obții o
              interpretare nutrițională imediată.
            </p>
          </div>
        </div>
        <div className="col-1-of-4">
          <div className="feature-box">
            <IconContext.Provider value={{ className: "feature-box__icon" }}>
              <GiMeal />
            </IconContext.Provider>
            <h3 className="heading-tertiary">Plan alimentar pe 7 zile</h3>
            <p className="feature-box__text">
              Primești un meniu complet pe 7 zile adaptat valorilor tale anormale,
              generat de NutriRAG pe baza datelor din FooDB, PubChem și
              ADMETLab 3.0 — nu inventat de AI.
            </p>
          </div>
        </div>
        <div className="col-1-of-4">
          <div className="feature-box">
            <IconContext.Provider value={{ className: "feature-box__icon" }}>
              <IoChatbubblesOutline />
            </IconContext.Provider>
            <h3 className="heading-tertiary">Chat nutrițional inteligent</h3>
            <p className="feature-box__text">
              Pune întrebări despre nutrienți, alimente sau compoziție chimică și
              primești răspunsuri cu surse citate explicit — fără halucinații,
              fiecare afirmație este ancorată în baza de date.
            </p>
          </div>
        </div>
        <div className="col-1-of-4">
          <div className="feature-box">
            <IconContext.Provider value={{ className: "feature-box__icon" }}>
              <TbSalad />
            </IconContext.Provider>
            <h3 className="heading-tertiary">Rețete și jurnal de calorii</h3>
            <p className="feature-box__text">
              Generează rețete personalizate pentru fiecare masă din plan,
              salvează-le în colecție și urmărește caloriile consumate zilnic
              prin jurnalul integrat.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
