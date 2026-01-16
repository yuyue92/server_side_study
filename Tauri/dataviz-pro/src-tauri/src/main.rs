// src-tauri/src/main.rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::File;
use std::io::BufReader;
use tauri::State;
use std::sync::Mutex;

// 数据结构定义
#[derive(Debug, Serialize, Deserialize, Clone)]
struct DataRow {
    values: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DataSummary {
    total_rows: usize,
    columns: Vec<String>,
    sample_data: Vec<DataRow>,
    statistics: HashMap<String, ColumnStats>,
}

#[derive(Debug, Serialize, Deserialize)]
struct ColumnStats {
    count: usize,
    unique: usize,
    null_count: usize,
    numeric_stats: Option<NumericStats>,
}

#[derive(Debug, Serialize, Deserialize)]
struct NumericStats {
    min: f64,
    max: f64,
    mean: f64,
    sum: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ChartData {
    labels: Vec<String>,
    datasets: Vec<Dataset>,
}

#[derive(Debug, Serialize, Deserialize)]
struct Dataset {
    label: String,
    data: Vec<f64>,
}

// 应用状态管理
struct AppState {
    current_data: Mutex<Vec<DataRow>>,
    current_columns: Mutex<Vec<String>>,
}

// Tauri 命令：加载 CSV 文件
#[tauri::command]
async fn load_csv_file(
    path: String,
    state: State<'_, AppState>,
) -> Result<DataSummary, String> {
    let file = File::open(&path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let mut csv_reader = csv::Reader::from_reader(reader);

    // 读取表头
    let headers = csv_reader
        .headers()
        .map_err(|e| e.to_string())?
        .iter()
        .map(|s| s.to_string())
        .collect::<Vec<String>>();

    let mut all_rows = Vec::new();
    let mut sample_data = Vec::new();

    // 读取所有数据
    for (idx, result) in csv_reader.records().enumerate() {
        let record = result.map_err(|e| e.to_string())?;
        let mut values = HashMap::new();

        for (i, field) in record.iter().enumerate() {
            if let Some(header) = headers.get(i) {
                values.insert(header.clone(), field.to_string());
            }
        }

        let row = DataRow { values };
        all_rows.push(row.clone());

        // 保留前 100 行作为样本
        if idx < 100 {
            sample_data.push(row);
        }
    }

    // 计算统计信息
    let statistics = calculate_statistics(&all_rows, &headers);

    // 更新应用状态
    *state.current_data.lock().unwrap() = all_rows.clone();
    *state.current_columns.lock().unwrap() = headers.clone();

    Ok(DataSummary {
        total_rows: all_rows.len(),
        columns: headers,
        sample_data,
        statistics,
    })
}

// 统计计算函数
fn calculate_statistics(
    data: &[DataRow],
    columns: &[String],
) -> HashMap<String, ColumnStats> {
    let mut stats = HashMap::new();

    for col in columns {
        let mut count = 0;
        let mut null_count = 0;
        let mut unique_values = std::collections::HashSet::new();
        let mut numeric_values = Vec::new();

        for row in data {
            if let Some(value) = row.values.get(col) {
                if value.is_empty() {
                    null_count += 1;
                } else {
                    count += 1;
                    unique_values.insert(value.clone());

                    // 尝试解析为数字
                    if let Ok(num) = value.parse::<f64>() {
                        numeric_values.push(num);
                    }
                }
            }
        }

        let numeric_stats = if !numeric_values.is_empty() {
            let sum: f64 = numeric_values.iter().sum();
            let mean = sum / numeric_values.len() as f64;
            let min = numeric_values.iter().cloned().fold(f64::INFINITY, f64::min);
            let max = numeric_values.iter().cloned().fold(f64::NEG_INFINITY, f64::max);

            Some(NumericStats { min, max, mean, sum })
        } else {
            None
        };

        stats.insert(
            col.clone(),
            ColumnStats {
                count,
                unique: unique_values.len(),
                null_count,
                numeric_stats,
            },
        );
    }

    stats
}

// 数据聚合命令
#[tauri::command]
async fn aggregate_data(
    group_by: String,
    agg_column: String,
    agg_func: String,
    state: State<'_, AppState>,
) -> Result<ChartData, String> {
    let data = state.current_data.lock().unwrap();
    let mut groups: HashMap<String, Vec<f64>> = HashMap::new();

    // 分组收集数据
    for row in data.iter() {
        let group_value = row
            .values
            .get(&group_by)
            .unwrap_or(&"Unknown".to_string())
            .clone();

        if let Some(value_str) = row.values.get(&agg_column) {
            if let Ok(value) = value_str.parse::<f64>() {
                groups.entry(group_value).or_insert_with(Vec::new).push(value);
            }
        }
    }

    // 执行聚合计算
    let mut labels = Vec::new();
    let mut data_values = Vec::new();

    for (label, values) in groups.iter() {
        labels.push(label.clone());

        let agg_value = match agg_func.as_str() {
            "sum" => values.iter().sum(),
            "avg" => values.iter().sum::<f64>() / values.len() as f64,
            "min" => values.iter().cloned().fold(f64::INFINITY, f64::min),
            "max" => values.iter().cloned().fold(f64::NEG_INFINITY, f64::max),
            "count" => values.len() as f64,
            _ => 0.0,
        };

        data_values.push(agg_value);
    }

    Ok(ChartData {
        labels,
        datasets: vec![Dataset {
            label: format!("{} of {}", agg_func, agg_column),
            data: data_values,
        }],
    })
}

// 数据过滤命令
#[tauri::command]
async fn filter_data(
    column: String,
    operator: String,
    value: String,
    state: State<'_, AppState>,
) -> Result<usize, String> {
    let mut data = state.current_data.lock().unwrap();
    
    data.retain(|row| {
        if let Some(cell_value) = row.values.get(&column) {
            match operator.as_str() {
                "equals" => cell_value == &value,
                "contains" => cell_value.contains(&value),
                "greater" => {
                    if let (Ok(cv), Ok(v)) = (cell_value.parse::<f64>(), value.parse::<f64>()) {
                        cv > v
                    } else {
                        false
                    }
                }
                "less" => {
                    if let (Ok(cv), Ok(v)) = (cell_value.parse::<f64>(), value.parse::<f64>()) {
                        cv < v
                    } else {
                        false
                    }
                }
                _ => true,
            }
        } else {
            false
        }
    });

    Ok(data.len())
}

// 导出处理后的数据
#[tauri::command]
async fn export_data(
    path: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let data = state.current_data.lock().unwrap();
    let columns = state.current_columns.lock().unwrap();

    let file = File::create(&path).map_err(|e| e.to_string())?;
    let mut writer = csv::Writer::from_writer(file);

    // 写入表头
    writer.write_record(&*columns).map_err(|e| e.to_string())?;

    // 写入数据
    for row in data.iter() {
        let record: Vec<String> = columns
            .iter()
            .map(|col| row.values.get(col).unwrap_or(&String::new()).clone())
            .collect();
        writer.write_record(&record).map_err(|e| e.to_string())?;
    }

    writer.flush().map_err(|e| e.to_string())?;
    Ok(format!("Data exported to {}", path))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState {
            current_data: Mutex::new(Vec::new()),
            current_columns: Mutex::new(Vec::new()),
        })
        .invoke_handler(tauri::generate_handler![
            load_csv_file,
            aggregate_data,
            filter_data,
            export_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}