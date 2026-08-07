/* Root app: mounts login → shell */
function App() {
  const [user, setUser] = useState(null);
  const [splitInitial, setSplitInitial] = useState(false);
  const handleLogin = (u, opts) => { setUser(u); setSplitInitial(!!opts?.splitDemo); };
  const handleLogout = () => setUser(null);
  const handleSwitch = (u) => setUser(u);

  return (
    <ToastProvider>
      {!user ? <LoginScreen onEnter={handleLogin}/> : <AppShell user={user} onSwitch={handleSwitch} onLogout={handleLogout} initialSplit={splitInitial}/>}
    </ToastProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
