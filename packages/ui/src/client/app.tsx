const { useState, useEffect } = React;
const { getExecutions, getExecution } = Api;

const ExecutionList = () => {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadExecutions = async () => {
    try {
      setLoading(true);
      const data = await getExecutions();
      setExecutions(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutions();
    const interval = setInterval(loadExecutions, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading && executions.length === 0) {
    return <div className="loading">Loading executions...</div>;
  }

  if (error) {
    return <div className="empty">Error: {error}</div>;
  }

  if (executions.length === 0) {
    return <div className="empty">No executions yet</div>;
  }

  return (
    <div className="container">
      <div className="header">
        <h1>PART Debug UI</h1>
        <button className="refresh-btn" onClick={loadExecutions}>Refresh</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Execution ID</th>
            <th>Agent</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Started</th>
            <th>Message</th>
          </tr>
        </thead>
        <tbody>
          {executions.map(exec => (
            <tr key={exec.executionId} className="row-link" onClick={() => window.location.hash = `#/executions/${exec.executionId}`}>
              <td>{exec.executionId}</td>
              <td>{exec.agentId || 'N/A'}</td>
              <td><span className={`status ${exec.status}`}>{exec.status}</span></td>
              <td>{exec.durationMs ? `${exec.durationMs}ms` : '-'}</td>
              <td>{new Date(exec.startTime).toLocaleString()}</td>
              <td>{exec.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const ExecutionDetail = () => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const executionId = window.location.hash.split('/')[2];

  const loadDetail = async () => {
    try {
      setLoading(true);
      const data = await getExecution(executionId);
      setDetail(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
    const interval = setInterval(loadDetail, 3000);
    return () => clearInterval(interval);
  }, [executionId]);

  if (loading && !detail) {
    return <div className="loading">Loading execution details...</div>;
  }

  if (error) {
    return <div className="empty">Error: {error}</div>;
  }

  if (!detail) {
    return <div className="empty">Execution not found</div>;
  }

  const renderEvent = (event, index) => {
    const isExpanded = event.payload !== null && event.payload !== undefined;

    return (
      <div key={index} className="event">
        <span className="event-badge">{event.type}</span>
        <div className="event-time">{new Date(event.timestamp).toISOString()}</div>
        {isExpanded && (
          <EventPayload payload={event.payload} />
        )}
      </div>
    );
  };

  return (
    <div className="container">
      <button className="back-btn" onClick={() => window.location.hash = '#/'}>&larr; Back to Executions</button>

      <div className="meta-grid">
        <div className="meta-card">
          <div className="meta-label">Execution ID</div>
          <div className="meta-value">{detail.executionId}</div>
        </div>
        <div className="meta-card">
          <div className="meta-label">Agent ID</div>
          <div className="meta-value">{detail.agentId || 'N/A'}</div>
        </div>
        <div className="meta-card">
          <div className="meta-label">Status</div>
          <span className={`status ${detail.status}`}>{detail.status}</span>
        </div>
        <div className="meta-card">
          <div className="meta-label">Start Time</div>
          <div className="meta-value">{new Date(detail.startTime).toISOString()}</div>
        </div>
        {detail.endTime && (
          <div className="meta-card">
            <div className="meta-label">End Time</div>
            <div className="meta-value">{new Date(detail.endTime).toISOString()}</div>
          </div>
        )}
        {detail.durationMs && (
          <div className="meta-card">
            <div className="meta-label">Duration</div>
            <div className="meta-value">{detail.durationMs}ms</div>
          </div>
        )}
        <div className="meta-card">
          <div className="meta-label">Message</div>
          <div className="meta-value">{detail.message}</div>
        </div>
      </div>

      <div className="timeline">
        <h2>Event Timeline</h2>
        {detail.events.map(renderEvent)}
      </div>
    </div>
  );
};

const EventPayload = ({ payload }) => {
  const [collapsed, setCollapsed] = useState(true);
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (key) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderObject = (obj, path = '') => {
    const entries = Object.entries(obj);
    return entries.map(([key, value]) => {
      const fullPath = path ? `${path}.${key}` : key;
      const isObject = value !== null && typeof value === 'object';
      const isExpanded = expanded[fullPath];

      if (isObject) {
        return (
          <div key={key} style={{ marginLeft: '12px' }}>
            <div onClick={() => toggleExpand(fullPath)} style={{ cursor: 'pointer', color: '#58a6ff' }}>
              {isExpanded ? '▼' : '▶'} {key}:
            </div>
            {isExpanded && (
              <div style={{ marginLeft: '12px' }}>
                {renderObject(value, fullPath)}
              </div>
            )}
          </div>
        );
      }

      return (
        <div key={key} style={{ marginLeft: '12px' }}>
          <span style={{ color: '#79c0ff' }}>{key}</span>: <span style={{ color: '#d2a8ff' }}>{String(value)}</span>
        </div>
      );
    });
  };

  return (
    <div className={`event-payload ${collapsed ? 'collapsed' : ''}`}>
      <div className="event-payload-header" onClick={() => setCollapsed(!collapsed)}>
        <span>{collapsed ? '▶ Show Payload' : '▼ Hide Payload'}</span>
      </div>
      <div className="event-payload-content">
        {typeof payload === 'object' ? renderObject(payload) : String(payload)}
      </div>
    </div>
  );
};

const App = () => {
  const [view, setView] = useState('list');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#/executions/')) {
        setView('detail');
      } else {
        setView('list');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (view === 'detail') {
    return <ExecutionDetail />;
  }

  return <ExecutionList />;
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
