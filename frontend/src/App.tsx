import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { InvestigatePage } from './pages/InvestigatePage';
import { GraphPage } from './pages/GraphPage';
import { RemediationsPage } from './pages/RemediationsPage';
import { StatusPage } from './pages/StatusPage';
import { api } from './services/api';
import './index.css';

function App() {
  const [falkorStatus, setFalkorStatus] = useState<'ok' | 'error' | 'loading'>('loading');
  const [llmMode, setLlmMode] = useState('deterministic');

  useEffect(() => {
    api.health()
      .then((h) => {
        setFalkorStatus(h.falkordb === 'ok' ? 'ok' : 'error');
        setLlmMode(h.llm_mode);
      })
      .catch(() => setFalkorStatus('error'));
  }, []);

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar falkorStatus={falkorStatus} llmMode={llmMode} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/investigate" element={<InvestigatePage />} />
            <Route path="/graph" element={<GraphPage />} />
            <Route path="/remediations" element={<RemediationsPage />} />
            <Route path="/status" element={<StatusPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
