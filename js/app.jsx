/* Root app: mounts login → shell.

   One exception bypasses login entirely: a customer feedback link
   (?feedback=TOKEN) is meant to be opened by a customer who has no account
   at all, so it renders its own self-contained page before anything else —
   never the admin/employee login screen. */
function App() {
  const [user, setUser] = useState(null);
  const [splitInitial, setSplitInitial] = useState(false);
  const handleLogin = (u, opts) => { setUser(u); setSplitInitial(!!opts?.splitDemo); };
  const handleLogout = () => setUser(null);
  const handleSwitch = (u) => setUser(u);

  const feedbackToken = (() => {
    try { return new URLSearchParams(location.search).get('feedback'); } catch (e) { return null; }
  })();

  return (
    <ToastProvider>
      {feedbackToken
        ? <CustomerFeedbackForm token={feedbackToken}/>
        : !user ? <LoginScreen onEnter={handleLogin}/> : <AppShell user={user} onSwitch={handleSwitch} onLogout={handleLogout} initialSplit={splitInitial}/>}
    </ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
