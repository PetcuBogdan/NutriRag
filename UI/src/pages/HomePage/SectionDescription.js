/* eslint-disable jsx-a11y/img-redundant-alt */
import Photo1 from "../../img/cover-nutritie.jpg";
import Photo2 from "../../img/main-p2.jpeg";
import Photo3 from "../../img/main-page2.jpg";

export default function SectionDescription() {
  return (
    <section className="section-about">
      <div className="u-center-text u-margin-bottom-big">
        <h2 className="heading-secundary">Despre NutriRAG</h2>
      </div>

      <div className="row">
        <div className="col-1-of-2">
          <h3 className="heading-tertiary u-margin-bottom-small">
            Nutriție personalizată bazată pe știință, nu pe estimări:
          </h3>
          <p className="paragraph">
            NutriRAG analizează rezultatele tale medicale — glicemie, colesterol,
            vitamina D, fier, hemoglobină și multe altele — și generează un plan
            alimentar pe 7 zile adaptat exact valorilor tale anormale. Fiecare
            recomandare este fundamentată pe date reale din FooDB, PubChem și
            ADMETLab&nbsp;3.0, nu inventată de modelul de limbaj.
          </p>

          <h3 className="heading-tertiary u-margin-botton-small2">
            RAG hibrid cu surse verificate — zero halucinații:
          </h3>
          <p className="paragraph">
            Spre deosebire de chatboți generici, NutriRAG folosește o arhitectură
            RAG hibridă (căutare densă Pinecone + BM25) cu reranking cross-encoder
            pentru a selecta cele mai relevante informații nutriționale. Fiecare
            afirmație citează sursa: compoziție din FooDB, structură moleculară din
            PubChem sau biodisponibilitate din ADMETLab&nbsp;3.0.
          </p>
        </div>

        <div className="col-1-of-2">
          <div className="composition">
            <img
              src={Photo1}
              alt="Alimente sănătoase"
              className="composition__photo composition__photo--p1"
            />
            <img
              src={Photo2}
              alt="Plan nutrițional"
              className="composition__photo composition__photo--p2"
            />
            <img
              src={Photo3}
              alt="Ingrediente naturale"
              className="composition__photo composition__photo--p3"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
