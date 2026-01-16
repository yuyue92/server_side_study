// src/App.tsx
import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import './App.css';

// 类型定义
interface DataRow {
  values: Record<string, string>;
}

interface ColumnStats {
  count: number;
  unique: number;
  null_count: number;
  numeric_stats?: {
    min: number;
    max: number;
    mean: number;
    sum: number;
  };
}

interface DataSummary {
  total_rows: number;
  columns: string[];
  sample_data: DataRow[];
  statistics: Record<string, ColumnStats>;
}

interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
  }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

function App() {
  const [dataSummary, setDataSummary] = useState<DataSummary | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [selectedGroupBy, setSelectedGroupBy] = useState('');
  const [selectedAggColumn, setSelectedAggColumn] = useState('');
  const [selectedAggFunc, setSelectedAggFunc] = useState('sum');
  const [filterColumn, setFilterColumn] = useState('');
  const [filterOperator, setFilterOperator] = useState('equals');
  const [filterValue, setFilterValue] = useState('');
  const [message, setMessage] = useState('');

  // 加载 CSV 文件
  const handleLoadFile = async () => {
    try {
      setLoading(true);
      setMessage('');

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Data Files',
            extensions: ['csv', 'json', 'txt', 'log'],
          },
        ],
      });

      if (selected) {
        const summary: DataSummary = await invoke('load_csv_file', {
          path: selected,
        });

        setDataSummary(summary);
        setMessage(`✅ 成功加载 ${summary.total_rows.toLocaleString()} 行数据`);

        // 自动设置默认聚合字段
        if (summary.columns.length > 0) {
          setSelectedGroupBy(summary.columns[0]);
          const numericCol = summary.columns.find(
            (col) => summary.statistics[col]?.numeric_stats
          );
          if (numericCol) {
            setSelectedAggColumn(numericCol);
          }
        }
      }
    } catch (error) {
      setMessage(`❌ 错误: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 执行数据聚合
  const handleAggregate = async () => {
    if (!selectedGroupBy || !selectedAggColumn) {
      setMessage('⚠️ 请选择分组字段和聚合字段');
      return;
    }

    try {
      setLoading(true);
      const result: ChartData = await invoke('aggregate_data', {
        groupBy: selectedGroupBy,
        aggColumn: selectedAggColumn,
        aggFunc: selectedAggFunc,
      });

      setChartData(result);
      setMessage('✅ 聚合计算完成');
    } catch (error) {
      setMessage(`❌ 聚合失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 执行数据过滤
  const handleFilter = async () => {
    if (!filterColumn || !filterValue) {
      setMessage('⚠️ 请填写过滤条件');
      return;
    }

    try {
      setLoading(true);
      const remainingRows: number = await invoke('filter_data', {
        column: filterColumn,
        operator: filterOperator,
        value: filterValue,
      });

      setMessage(`✅ 过滤完成，剩余 ${remainingRows} 行数据`);
    } catch (error) {
      setMessage(`❌ 过滤失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 导出数据
  const handleExport = async () => {
    try {
      const savePath = await save({
        filters: [
          {
            name: 'CSV',
            extensions: ['csv'],
          },
        ],
      });

      if (savePath) {
        const result: string = await invoke('export_data', {
          path: savePath,
        });
        setMessage(`✅ ${result}`);
      }
    } catch (error) {
      setMessage(`❌ 导出失败: ${error}`);
    }
  };

  // 渲染图表
  const renderChart = () => {
    if (!chartData || chartData.labels.length === 0) return null;

    // ✅ 保险：把 value 强制转成 number，避免后端/序列化导致的 string/NaN
    const data = chartData.labels.map((label, idx) => ({
      name: label,
      value: Number(chartData.datasets?.[0]?.data?.[idx] ?? 0) || 0,
    }));

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="value" stroke="#8884d8" />
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie': {
        // ✅ 修复点：
        // 1) 不用 ResponsiveContainer 的 function-children（旧版 recharts 会导致不渲染 -> 空图）
        // 2) outerRadius 使用百分比，自动适配容器尺寸，避免溢出
        // 3) 关闭 label（label 默认会画到外面，容易撑出容器）
        // 4) 给 Legend 预留固定高度，避免把饼图挤出可视区域
        const legendHeight = 64;

        // 如果全是 0，Pie 在一些版本里会“看起来像空图”，这里给出提示
        const total = data.reduce((s, d) => s + (Number.isFinite(d.value) ? d.value : 0), 0);
        if (total <= 0) {
          return <div style={{ padding: 12 }}>⚠️ 当前聚合结果全部为 0，无法绘制饼图。</div>;
        }

        return (
          <ResponsiveContainer width="100%" height={400}>
            <PieChart margin={{ top: 8, right: 8, bottom: legendHeight, left: 8 }}>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="42%"
                outerRadius="70%"
                label={false}
                labelLine={false}
                isAnimationActive={false}
                minAngle={1}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>

              <Tooltip />

              <Legend
                verticalAlign="bottom"
                height={legendHeight}
                wrapperStyle={{
                  maxHeight: legendHeight,
                  overflowY: 'auto',
                  paddingTop: 4,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📊 Tauri 数据可视化工具</h1>
        <p>高性能本地数据分析平台</p>
      </header>

      <main className="app-main">
        {/* 文件加载区 */}
        <section className="section">
          <h2>1️⃣ 数据加载</h2>
          <button onClick={handleLoadFile} disabled={loading} className="btn-primary">
            📂 选择文件 (CSV/JSON/Log)
          </button>

          {dataSummary && (
            <div className="data-info">
              <p>
                <strong>总行数:</strong> {dataSummary.total_rows.toLocaleString()}
              </p>
              <p>
                <strong>列数:</strong> {dataSummary.columns.length}
              </p>
              <p>
                <strong>字段:</strong> {dataSummary.columns.join(', ')}
              </p>
            </div>
          )}
        </section>

        {/* 统计信息区 */}
        {dataSummary && (
          <section className="section">
            <h2>2️⃣ 数据统计</h2>
            <div className="stats-grid">
              {Object.entries(dataSummary.statistics).map(([col, stats]) => (
                <div key={col} className="stat-card">
                  <h3>{col}</h3>
                  <p>有效值: {stats.count}</p>
                  <p>唯一值: {stats.unique}</p>
                  <p>空值: {stats.null_count}</p>
                  {stats.numeric_stats && (
                    <div className="numeric-stats">
                      <p>最小: {stats.numeric_stats.min.toFixed(2)}</p>
                      <p>最大: {stats.numeric_stats.max.toFixed(2)}</p>
                      <p>平均: {stats.numeric_stats.mean.toFixed(2)}</p>
                      <p>总和: {stats.numeric_stats.sum.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 数据处理区 */}
        {dataSummary && (
          <section className="section">
            <h2>3️⃣ 数据处理</h2>

            <div className="controls">
              <div className="control-group">
                <h3>数据聚合</h3>
                <select
                  value={selectedGroupBy}
                  onChange={(e) => setSelectedGroupBy(e.target.value)}
                >
                  <option value="">选择分组字段</option>
                  {dataSummary.columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedAggColumn}
                  onChange={(e) => setSelectedAggColumn(e.target.value)}
                >
                  <option value="">选择聚合字段</option>
                  {dataSummary.columns
                    .filter((col) => dataSummary.statistics[col]?.numeric_stats)
                    .map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                </select>

                <select value={selectedAggFunc} onChange={(e) => setSelectedAggFunc(e.target.value)}>
                  <option value="sum">求和</option>
                  <option value="avg">平均</option>
                  <option value="min">最小</option>
                  <option value="max">最大</option>
                  <option value="count">计数</option>
                </select>

                <button onClick={handleAggregate} className="btn-secondary">
                  🔄 执行聚合
                </button>
              </div>

              <div className="control-group">
                <h3>数据过滤</h3>
                <select value={filterColumn} onChange={(e) => setFilterColumn(e.target.value)}>
                  <option value="">选择字段</option>
                  {dataSummary.columns.map((col) => (
                    <option key={col} value={col}>
                      {col}
                    </option>
                  ))}
                </select>

                <select
                  value={filterOperator}
                  onChange={(e) => setFilterOperator(e.target.value)}
                >
                  <option value="equals">等于</option>
                  <option value="contains">包含</option>
                  <option value="greater">大于</option>
                  <option value="less">小于</option>
                </select>

                <input
                  type="text"
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  placeholder="过滤值"
                />

                <button onClick={handleFilter} className="btn-secondary">
                  🔍 执行过滤
                </button>
              </div>
            </div>
          </section>
        )}

        {/* 可视化区 */}
        {chartData && (
          <section className="section">
            <h2>4️⃣ 数据可视化</h2>

            <div className="chart-controls">
              <button
                onClick={() => setChartType('bar')}
                className={chartType === 'bar' ? 'active' : ''}
              >
                📊 柱状图
              </button>
              <button
                onClick={() => setChartType('line')}
                className={chartType === 'line' ? 'active' : ''}
              >
                📈 折线图
              </button>
              <button
                onClick={() => setChartType('pie')}
                className={chartType === 'pie' ? 'active' : ''}
              >
                🥧 饼图
              </button>
            </div>

            {/* 兜底：避免任何绘制越界造成页面横向溢出 */}
            <div className="chart-container" style={{ overflow: 'hidden' }}>
              {renderChart()}
            </div>
          </section>
        )}

        {/* 导出区 */}
        {dataSummary && (
          <section className="section">
            <h2>5️⃣ 数据导出</h2>
            <button onClick={handleExport} className="btn-primary">
              💾 导出处理后的数据
            </button>
          </section>
        )}

        {/* 消息提示 */}
        {message && (
          <div className={`message ${message.includes('❌') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        {loading && <div className="loading">⏳ 处理中...</div>}
      </main>

      <footer className="app-footer">
        <p>🔐 离线安全 | ⚡ Rust 驱动 | 🚀 高性能本地计算</p>
      </footer>
    </div>
  );
}

export default App;
