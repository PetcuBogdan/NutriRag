export default function ClientMsg({ text }) {
  return (
    <li className="conversation__item">
      <div className="conversation__item--content">
        <div className="conversation__item--wrapper">
          <div className="conversation__item--box">
            <div className="conversation__item--text">
              <p>{text}</p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
