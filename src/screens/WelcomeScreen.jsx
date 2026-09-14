export default function WelcomeScreen({ onContinue }) {
  return (
    <div className="centered">
      <div className="auth-card">
        <h1 className="auth-title">You're confirmed 🎉</h1>
        <p className="auth-sub">Your email is verified and you're logged in — your budget is ready.</p>
        <button className="add-btn" style={{ width: '100%', padding: '10px 0' }} onClick={onContinue}>
          Continue to Expense Planner
        </button>
      </div>
    </div>
  );
}
