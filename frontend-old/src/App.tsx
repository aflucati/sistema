import React, { ChangeEvent, useMemo, useState } from 'react';
import axios from 'axios';
import './App.css';

type Frequency = 'SEMANAL' | 'QUINZENAL' | 'PROXIMA_SEMANA' | 'PROXIMA_QUINZENA' | 'D0';

interface ManualEvent {
  id: string;
  day: string;
  cutoffHour: string;
  deliveryDay: string;
  frequency: Frequency;
}

interface ManualRoute {
  modal: string;
  geography: string;
  commercialLocation: string;
  locality: string;
  cd: string;
  routeDestination: string;
  events: ManualEvent[];
}

interface Summary {
  routes: number;
  events: number;
  rows: number;
}

interface WindowRow {
  cd: string;
  modal: string;
  geography: string;
  commercialLocation: string;
  locality: string;
  metodoCd: string;
  prazoCd: number;
  metodoTr: string;
  prazoTr: number;
  prazoCliente: number;
  horarioInicial: number;
  horarioFinal: number;
  rotaFixa: string;
  segunda: string;
  terca: string;
  quarta: string;
  quinta: string;
  sexta: string;
  sabado: string;
  domingo: string;
}

interface ApiResult {
  source: 'manual' | 'arquivo';
  fileName?: string;
  importedRoutes?: number;
  summary: Summary;
  rows: WindowRow[];
  html: string;
}

const API_URL = 'http://localhost:3001';
const DAYS = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
const FREQUENCIES: Frequency[] = ['SEMANAL', 'QUINZENAL', 'PROXIMA_SEMANA', 'PROXIMA_QUINZENA', 'D0'];

function createEmptyEvent(): ManualEvent {
  return {
    id: Math.random().toString(36).slice(2),
    day: 'Segunda-feira',
    cutoffHour: '18',
    deliveryDay: 'Terça-feira',
    frequency: 'SEMANAL',
  };
}

function createEmptyRoute(): ManualRoute {
  return {
    modal: 'DESTINO LOJA',
    geography: 'Convencional',
    commercialLocation: '',
    locality: '',
    cd: '',
    routeDestination: '',
    events: [createEmptyEvent()],
  };
}

function App() {
  const [manualRoute, setManualRoute] = useState<ManualRoute>(createEmptyRoute());
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summaryItems = useMemo(() => {
    if (!result) {
      return [];
    }

    return [
      { label: 'Rotas processadas', value: result.summary.routes },
      { label: 'Eventos logísticos', value: result.summary.events },
      { label: 'Linhas calculadas', value: result.summary.rows },
    ];
  }, [result]);

  const updateRouteField = (field: keyof Omit<ManualRoute, 'events'>, value: string) => {
    setManualRoute((current) => ({ ...current, [field]: value }));
  };

  const updateEventField = (eventId: string, field: keyof Omit<ManualEvent, 'id'>, value: string) => {
    setManualRoute((current) => ({
      ...current,
      events: current.events.map((event) => (event.id === eventId ? { ...event, [field]: value } : event)),
    }));
  };

  const addEvent = () => {
    setManualRoute((current) => ({ ...current, events: [...current.events, createEmptyEvent()] }));
  };

  const removeEvent = (eventId: string) => {
    setManualRoute((current) => ({
      ...current,
      events: current.events.length === 1 ? current.events : current.events.filter((event) => event.id !== eventId),
    }));
  };

  const handleCalculateManual = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post<ApiResult>(`${API_URL}/calculate`, {
        routes: [
          {
            modal: manualRoute.modal,
            geography: manualRoute.geography,
            commercialLocation: manualRoute.commercialLocation,
            locality: manualRoute.locality,
            cd: manualRoute.cd,
            routeDestination: manualRoute.routeDestination,
            events: manualRoute.events.map(({ id, ...event }) => event),
          },
        ],
      });

      setResult(response.data);
    } catch (requestError) {
      setError('Não foi possível calcular os prazos manuais. Verifique o backend e os campos preenchidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post<ApiResult>(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setResult(response.data);
    } catch (requestError) {
      setError('Não foi possível processar a planilha. Confirme se ela segue o padrão do PCP.');
    } finally {
      event.target.value = '';
      setLoading(false);
    }
  };

  const handleDownloadHtml = () => {
    if (!result?.html) {
      return;
    }

    const blob = new Blob([result.html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'gestor_prazos_magalog.html';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">Gestão dinâmica de prazo</p>
          <h1>Gestor de prazos para programação logística</h1>
          <p className="hero-text">
            Cadastre uma rota manualmente ou envie a planilha padrão para calcular prazo CD, prazo TR e prazo cliente
            por janela de corte, respeitando o script operacional.
          </p>
        </div>

        <div className="hero-card">
          <span>Entradas aceitas</span>
          <strong>Manual, CSV e XLSX</strong>
          <p>O resultado já volta em tabela operacional e HTML pronto para exportação.</p>
        </div>
      </section>

      <section className="workspace-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <h2>Entrada manual da rota</h2>
              <p>Preencha os dados da rota e a lista de cargas para simular o cálculo.</p>
            </div>
            <button className="ghost-button" onClick={() => setManualRoute(createEmptyRoute())} type="button">
              Limpar
            </button>
          </div>

          <div className="form-grid">
            <label>
              Modal
              <input value={manualRoute.modal} onChange={(e) => updateRouteField('modal', e.target.value)} />
            </label>
            <label>
              Geografia
              <input value={manualRoute.geography} onChange={(e) => updateRouteField('geography', e.target.value)} />
            </label>
            <label>
              Localização Comercial
              <input
                placeholder="1013 - MARACAJU"
                value={manualRoute.commercialLocation}
                onChange={(e) => updateRouteField('commercialLocation', e.target.value)}
              />
            </label>
            <label>
              Localidade
              <input value={manualRoute.locality} onChange={(e) => updateRouteField('locality', e.target.value)} />
            </label>
            <label>
              CD
              <input value={manualRoute.cd} onChange={(e) => updateRouteField('cd', e.target.value)} />
            </label>
            <label>
              Rota / Destino
              <input
                value={manualRoute.routeDestination}
                onChange={(e) => updateRouteField('routeDestination', e.target.value)}
              />
            </label>
          </div>

          <div className="events-header">
            <div>
              <h3>Eventos de carga</h3>
              <p>Cada evento representa uma carga com seu corte, dia de entrega real e frequência.</p>
            </div>
            <button className="primary-button" onClick={addEvent} type="button">
              Adicionar evento
            </button>
          </div>

          <div className="events-list">
            {manualRoute.events.map((routeEvent, index) => (
              <div className="event-card" key={routeEvent.id}>
                <div className="event-card-header">
                  <strong>Evento {index + 1}</strong>
                  <button className="ghost-button small" onClick={() => removeEvent(routeEvent.id)} type="button">
                    Remover
                  </button>
                </div>

                <div className="event-grid">
                  <label>
                    Dia da carga
                    <select value={routeEvent.day} onChange={(e) => updateEventField(routeEvent.id, 'day', e.target.value)}>
                      {DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Corte final
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={routeEvent.cutoffHour}
                      onChange={(e) => updateEventField(routeEvent.id, 'cutoffHour', e.target.value)}
                    />
                  </label>
                  <label>
                    Dia da entrega real
                    <select
                      value={routeEvent.deliveryDay}
                      onChange={(e) => updateEventField(routeEvent.id, 'deliveryDay', e.target.value)}
                    >
                      {DAYS.map((day) => (
                        <option key={day} value={day}>
                          {day}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Frequência
                    <select
                      value={routeEvent.frequency}
                      onChange={(e) => updateEventField(routeEvent.id, 'frequency', e.target.value)}
                    >
                      {FREQUENCIES.map((frequency) => (
                        <option key={frequency} value={frequency}>
                          {frequency}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ))}
          </div>

          <button className="primary-button wide" onClick={handleCalculateManual} disabled={loading} type="button">
            {loading ? 'Calculando...' : 'Calcular prazo da rota'}
          </button>
        </div>

        <div className="panel panel-accent">
          <div className="panel-header">
            <div>
              <h2>Processamento em lote</h2>
              <p>Envie a planilha padrão do PCP para calcular centenas ou milhares de linhas.</p>
            </div>
          </div>

          <label className="upload-dropzone">
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleUpload} />
            <span>Selecionar planilha padrão</span>
            <small>Compatível com `pcp.xlsx` e `pcp.csv`.</small>
          </label>

          <div className="notes">
            <h3>O que o sistema faz</h3>
            <ul>
              <li>Normaliza os eventos por rota usando localização comercial, geografia e modal.</li>
              <li>Calcula as janelas por dia e aplica a próxima carga disponível após o corte.</li>
              <li>Ajusta prazo ofertado em dias úteis e monta o HTML final no template oficial.</li>
            </ul>
          </div>

          {error ? <div className="error-box">{error}</div> : null}

          {result ? (
            <div className="summary-grid">
              {summaryItems.map((item) => (
                <div className="summary-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {result ? (
        <section className="results-section">
          <div className="results-header">
            <div>
              <p className="eyebrow">Resultado calculado</p>
              <h2>{result.source === 'arquivo' ? `Planilha ${result.fileName ?? ''}` : 'Simulação manual'}</h2>
            </div>
            <button className="primary-button" onClick={handleDownloadHtml} type="button">
              Baixar HTML
            </button>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>CD</th>
                  <th>Modal</th>
                  <th>Geografia</th>
                  <th>Localização Comercial</th>
                  <th>Localidade</th>
                  <th>Prazo CD</th>
                  <th>Prazo TR</th>
                  <th>Cliente</th>
                  <th>H. Inicial</th>
                  <th>H. Final</th>
                  <th>Seg</th>
                  <th>Ter</th>
                  <th>Qua</th>
                  <th>Qui</th>
                  <th>Sex</th>
                  <th>Sab</th>
                  <th>Dom</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.slice(0, 120).map((row, index) => (
                  <tr key={`${row.commercialLocation}-${row.horarioInicial}-${row.horarioFinal}-${index}`}>
                    <td>{row.cd}</td>
                    <td>{row.modal}</td>
                    <td>{row.geography}</td>
                    <td>{row.commercialLocation}</td>
                    <td>{row.locality}</td>
                    <td>{row.prazoCd}</td>
                    <td>{row.prazoTr}</td>
                    <td>{row.prazoCliente}</td>
                    <td>{row.horarioInicial}</td>
                    <td>{row.horarioFinal}</td>
                    <td className={row.segunda === 'OK' ? 'ok-cell' : 'nok-cell'}>{row.segunda}</td>
                    <td className={row.terca === 'OK' ? 'ok-cell' : 'nok-cell'}>{row.terca}</td>
                    <td className={row.quarta === 'OK' ? 'ok-cell' : 'nok-cell'}>{row.quarta}</td>
                    <td className={row.quinta === 'OK' ? 'ok-cell' : 'nok-cell'}>{row.quinta}</td>
                    <td className={row.sexta === 'OK' ? 'ok-cell' : 'nok-cell'}>{row.sexta}</td>
                    <td className={row.sabado === 'OK' ? 'ok-cell' : 'nok-cell'}>{row.sabado}</td>
                    <td className={row.domingo === 'OK' ? 'ok-cell' : 'nok-cell'}>{row.domingo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="table-footnote">
            Exibindo até 120 linhas no preview da interface. O HTML baixado contém o resultado completo calculado.
          </p>

          <div className="preview-panel">
            <div className="panel-header">
              <div>
                <h2>Preview do HTML oficial</h2>
                <p>Renderização do arquivo pronto para exportação.</p>
              </div>
            </div>
            <iframe className="preview-frame" srcDoc={result.html} title="Preview do HTML gerado" />
          </div>
        </section>
      ) : null}
    </div>
  );
}

export default App;
