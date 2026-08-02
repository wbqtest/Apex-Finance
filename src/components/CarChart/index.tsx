// 车贷精算师 - uCharts 图表封装（跨端：H5 + 小程序）
import { useEffect, useRef, useCallback, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Canvas } from '@tarojs/components';
import UCharts from '@qiun/ucharts';
import './index.less';

const IS_H5 = Taro.getEnv() === Taro.ENV_TYPE.WEB;
const IS_RN = Taro.getEnv() === Taro.ENV_TYPE.RN;

export type ChartKind = 'pie' | 'ring' | 'line' | 'area' | 'bar';

export interface CarChartProps {
  kind: ChartKind;
  data: Record<string, any>[];
  height?: number;
  nameField?: string; // x 轴字段 / 饼图名称字段
  valueField?: string; // y 轴字段 / 饼图数值字段
  seriesField?: string | string[]; // 折线图多 series
  seriesNames?: string[]; // 折线图 series 中文名
  centerTitle?: string; // 环形图中心标题
  centerSubtitle?: string; // 环形图中心数值
  markPoint?: Record<string, any>; // 折线图标记点
}

type UChartsInstance = {
  showToolTip: (e: { x: number; y: number }) => void;
  touchLegend: (e: { x: number; y: number }) => void;
  [key: string]: any;
};

export default function CarChart(props: CarChartProps) {
  const chartId = useRef(`uchart_${Math.random().toString(36).slice(2, 8)}`).current;
  const instanceRef = useRef<UChartsInstance | null>(null);
  // 仅 H5 使用原生 canvas，类型用 any 兼容 RN（RN 端该 ref 从不被使用）
  const canvasElRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  const chartHeight = props.height || 220;
  const dataKey = JSON.stringify(props.data);

  // ---- 根据 props 构建 uCharts 配置（对齐官方示例格式）----
  const buildOpts = useCallback(
    (width: number, height: number): Record<string, any> => {
      const {
        kind,
        data,
        nameField = 'name',
        valueField = 'value',
        seriesField,
        seriesNames,
        centerTitle,
        centerSubtitle,
        markPoint,
      } = props;
      const xField = nameField || 'x';
      const yField = valueField || 'y';
      const pixelRatio = IS_H5 ? window.devicePixelRatio || 1 : 1;
      const base: Record<string, any> = {
        type: kind === 'bar' ? 'column' : kind === 'ring' ? 'pie' : kind,
        context: undefined as any, // 将由调用方注入
        width: Math.round(width * pixelRatio),
        height: Math.round(height * pixelRatio),
        pixelRatio,
        animation: true,
        background: '#FFFFFF',
        color: ['#1890FF', '#91CB74', '#FAC858', '#EE6666', '#73C0DE', '#3CA272', '#FC8452', '#9A60B4', '#ea7ccc'],
        padding: [15, 15, 0, 15],
        enableScroll: false,
        legend: { show: true },
        extra: {} as Record<string, any>,
      };

      // Y 轴数值统一格式化（大额转万、小额取整）
      const formatAxisValue = (val: number) => {
        const v = Number(val);
        if (Number.isNaN(v)) return '';
        if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(1)}万`;
        return `${Math.round(v)}`;
      };

      if (kind === 'pie' || kind === 'ring') {
        // 官方格式: series: [{ data: [{name, value}, ...] }]
        base.series = [
          {
            data: data.map((d) => ({ name: d[nameField], value: d[valueField] })),
          },
        ];
        base.dataLabel = true;
        if (kind === 'ring') {
          base.subtitle = {
            name: centerSubtitle || '',
            fontSize: IS_H5 ? 20 : 16,
            color: '#1A1A1A',
            fontWeight: 'bold',
          };
          base.title = {
            name: centerTitle || '',
            fontSize: IS_H5 ? 12 : 10,
            color: '#6B7280',
          };
        }
        base.extra.pie = {
          activeOpacity: 0.5,
          activeRadius: 10,
          offsetAngle: 0,
          labelWidth: 15,
          border: true,
          borderWidth: 2,
          borderColor: '#FFFFFF',
        };
      } else if (kind === 'line') {
        // 官方格式: categories + series: [{name, data}, ...]
        const xs = data.map((d) => d[xField]);
        const fields = Array.isArray(seriesField)
          ? seriesField
          : seriesField
            ? [seriesField]
            : [yField];
        const names = seriesNames || fields;
        base.categories = xs;
        base.series = fields.map((field, idx) => ({
          name: names[idx] || field,
          data: data.map((d) => d[field]),
        }));
        base.padding = [15, 15, 30, 15];
        base.dataPointShape = true;
        base.dataLabel = false;
        base.tooltip = {
          show: true,
          showCategory: true,
          showMarker: false,
          format: (item: any, category: string, series: any) => {
            const val = item && typeof item === 'object' ? item.value : item;
            const name = series && typeof series === 'object' ? series.name : series;
            return `${name}: ${val}`;
          },
        };
        base.xAxis = {
          disableGrid: true,
          labelCount: Math.min(xs.length, 5),
          rotateLabel: xs.length > 8,
          fontSize: 10,
          fontColor: '#9CA3AF',
        };
        base.yAxis = {
          data: [{ min: 0, max: null, splitNumber: 4, format: formatAxisValue }],
          gridType: 'dash',
          dashLength: 2,
          fontSize: 10,
          fontColor: '#9CA3AF',
        };
        base.extra.line = { type: 'curve', width: 2 };
        if (markPoint) {
          base.extra.markPoint = markPoint;
        }
      } else if (kind === 'area') {
        // 官方格式: categories + series: [{name, data}, ...], type: "area"
        const xs = data.map((d) => d[xField]);
        base.padding = [15, 15, 30, 15];
        base.categories = xs;
        base.series = [
          {
            name: '剩余负债',
            data: data.map((d) => d[yField]),
          },
        ];
        base.dataLabel = false;
        base.tooltip = {
          show: true,
          showCategory: true,
          showMarker: false,
          format: (item: any, category: string, series: any) => {
            const val = item && typeof item === 'object' ? item.value : item;
            const name = series && typeof series === 'object' ? series.name : series;
            return `${name}: ${val}`;
          },
        };
        base.xAxis = {
          disableGrid: true,
          labelCount: Math.min(xs.length, 5),
          rotateLabel: xs.length > 8,
          fontSize: 10,
          fontColor: '#9CA3AF',
        };
        base.yAxis = {
          data: [{ min: 0, max: null, splitNumber: 4, format: formatAxisValue }],
          gridType: 'dash',
          dashLength: 2,
          fontSize: 10,
          fontColor: '#9CA3AF',
        };
        base.extra.area = {
          type: 'curve',
          opacity: 0.2,
          addLine: true,
          width: 2,
          gradient: true,
        };
      } else {
        // bar -> column
        // 官方格式: categories: [...], series: [{name, data}, ...]
        const names = data.map((d) => d[nameField]);
        const hideXLabel = names.length > 2;
        base.padding = [15, 15, hideXLabel ? 10 : 20, 15];
        base.categories = names;
        base.xAxis = {
          disableGrid: true,
          fontSize: hideXLabel ? 0 : 10,
          fontColor: hideXLabel ? 'transparent' : '#9CA3AF',
          labelCount: Math.min(names.length, 5),
        };
        base.yAxis = {
          data: [{ min: 0, max: null, splitNumber: 4, format: formatAxisValue }],
          gridType: 'dash',
          dashLength: 2,
        };

        const stackFields = Array.isArray(seriesField)
          ? seriesField
          : seriesField
            ? [seriesField]
            : [];

        if (stackFields.length > 1) {
          // 堆叠柱状图：本金 + 利息
          const sNames = seriesNames || stackFields;
          base.series = stackFields.map((field, idx) => ({
            name: sNames[idx] || field,
            data: data.map((d) => d[field]),
          }));
          base.legend = { show: true, position: 'bottom', fontSize: 10 };
          base.tooltip = {
            show: true,
            showCategory: true,
            showMarker: true,
            format: (item: any) => {
              const name = item?.name || '';
              const val = item?.data ?? item;
              return `${name}: ${val}`;
            },
          };
          base.extra.column = {
            type: 'stack',
            width: Math.max(14, Math.min(28, 200 / names.length)),
            activeBgColor: '#000000',
            activeOpacity: 0.08,
          };
        } else {
          // 单系列柱状图
          base.series = [
            {
              name: '',
              data: data.map((d) => d[valueField]),
            },
          ];
          base.legend = { show: false };
          base.tooltip = {
            show: true,
            showCategory: true,
            showMarker: false,
            format: (item: any, category: string) => `${category}: ${item}`,
          };
          base.extra.column = {
            type: 'group',
            width: Math.max(12, Math.min(22, 200 / names.length)),
          };
        }
      }

      return base;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dataKey, props.kind, props.nameField, props.valueField, props.seriesField, props.seriesNames, props.centerTitle, props.centerSubtitle, props.markPoint],
  );

  // ---- 初始化 / 更新图表 ----
  useEffect(() => {
    let destroyed = false;
    let retryTimer: any;

    const init = async () => {
      if (destroyed) return;
      // RN 环境下不初始化图表
      if (IS_RN) return;

      try {
        let ctx: CanvasRenderingContext2D | any;
        let w = 320;
        let h = chartHeight;

        console.log('🔍 [CarChart] UCharts 模块已静态导入:', typeof UCharts, UCharts ? '存在' : '不存在');
        if (!UCharts) {
          throw new Error('uCharts 加载失败');
        }

        if (IS_H5) {
          // H5 端：直接使用原生 <canvas>，便于通过 ref 获取 DOM 与上下文
          const canvas = canvasElRef.current;
          if (!canvas) {
            retryTimer = setTimeout(init, 80);
            return;
          }
          const rect = canvas.getBoundingClientRect();
          if (rect.width < 10 || rect.height < 10) {
            retryTimer = setTimeout(init, 80);
            return;
          }
          w = rect.width;
          h = rect.height;
          const dpr = window.devicePixelRatio || 1;
          canvas.width = Math.round(w * dpr);
          canvas.height = Math.round(h * dpr);
          canvas.style.width = `${w}px`;
          canvas.style.height = `${h}px`;
          ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('无法获取 H5 Canvas 2D 上下文');
          }
        } else {
          // 小程序端：通过 Taro API 获取上下文，并传给 uCharts
          try {
            const res = await new Promise<Taro.NodesRef.BoundingClientRectCallbackResult>(
              (resolve) => {
                const query = Taro.createSelectorQuery();
                query
                  .select(`#${chartId}`)
                  .boundingClientRect((rect: any) => {
                    resolve((rect || { width: 320, height: chartHeight }) as any);
                  })
                  .exec();
              },
            );
            if (res && res.width > 10) {
              w = res.width;
              h = res.height || h;
            }
          } catch (e) {
            console.warn('获取 canvas 尺寸失败', e);
          }

          ctx = Taro.createCanvasContext(chartId);
          if (!ctx) {
            throw new Error('无法获取小程序 Canvas 上下文');
          }
        }

        const opts = buildOpts(w, h);
        console.log('🔍 [CarChart] opts.type:', opts.type, 'series项数:', opts.series?.length, 'categories项数:', opts.categories?.length, 'kind:', props.kind);
        console.log('🔍 [CarChart] opts 完整配置:', JSON.parse(JSON.stringify(opts)));

        const inst = new UCharts({ ...opts, context: ctx }) as UChartsInstance;
        instanceRef.current = inst;
        console.log('🔍 [CarChart] uCharts 初始化成功, kind:', props.kind, 'width:', w, 'height:', h);

        if (IS_H5) {
          const canvas = canvasElRef.current!;
          const getPos = (e: MouseEvent) => {
            const rect = canvas.getBoundingClientRect();
            return { x: e.clientX - rect.left, y: e.clientY - rect.top };
          };
          // uCharts H5 内部会读取 event.changedTouches，需要构造兼容事件对象
          const wrapEvent = (e: MouseEvent) => {
            const pos = getPos(e);
            return {
              x: pos.x,
              y: pos.y,
              changedTouches: [{ x: pos.x, y: pos.y }],
              touches: [{ x: pos.x, y: pos.y }],
              target: { id: chartId },
            };
          };
          const onClick = (e: MouseEvent) => {
            try {
              const ev = wrapEvent(e);
              if (props.kind === 'pie' || props.kind === 'ring') {
                inst.touchLegend(ev);
              }
              inst.showToolTip(ev);
            } catch (err) {
              console.warn('图表点击事件处理失败:', err);
            }
          };
          const onMove = (e: MouseEvent) => {
            try {
              inst.showToolTip(wrapEvent(e));
            } catch (err) {
              console.warn('图表移动事件处理失败:', err);
            }
          };
          canvas.addEventListener('click', onClick);
          canvas.addEventListener('mousemove', onMove);
          // 保存清理函数
          (inst as any).__cleanup = () => {
            canvas.removeEventListener('click', onClick);
            canvas.removeEventListener('mousemove', onMove);
          };
        }

        setError(null);
      } catch (e) {
        console.error('🔍 [CarChart] 初始化失败, kind:', props.kind, e);
        setError(e instanceof Error ? e.message : '图表初始化失败');
      }
    };

    // 销毁旧实例
    if (instanceRef.current) {
      const inst = instanceRef.current as any;
      if (inst.__cleanup) inst.__cleanup();
      instanceRef.current = null;
    }

    init();

    return () => {
      destroyed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (instanceRef.current) {
        const inst = instanceRef.current as any;
        if (inst.__cleanup) inst.__cleanup();
        instanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, props.kind, chartId, chartHeight, buildOpts]);

  // ---- 小程序端触摸事件 ----
  const handleTouch = useCallback(
    (e: any) => {
      try {
        if (IS_H5 || !instanceRef.current) return;
        const touch = e.touches?.[0] || e.changedTouches?.[0] || e;
        if (!touch || typeof touch.x !== 'number' || typeof touch.y !== 'number') return;
        instanceRef.current.showToolTip({ x: touch.x, y: touch.y });
      } catch (err) {
        console.warn('图表触摸事件处理失败:', err);
      }
    },
    [],
  );

  // ---- 无数据占位 ----
  if (!props.data || props.data.length === 0) {
    console.log('🔍 [CarChart] 无数据，kind:', props.kind);
    return (
      <View className="car-chart car-chart-empty">
        暂无数据
      </View>
    );
  }

  // ---- 渲染错误占位 ----
  if (error) {
    console.log('🔍 [CarChart] 错误:', error, 'kind:', props.kind);
    return (
      <View className="car-chart car-chart-error">
        {error}
      </View>
    );
  }

  console.log('🔍 [CarChart] 渲染中, kind:', props.kind, 'data长度:', props.data.length, 'data首条:', JSON.parse(JSON.stringify(props.data[0])));

  // RN 环境下 Canvas 不可用，显示占位提示
  if (IS_RN) {
    return (
      <View className="car-chart car-chart-rn-placeholder">
        图表功能暂不支持 React Native 环境
      </View>
    );
  }

  return (
    <View className="car-chart" style={{ position: 'relative' }}>
      {IS_H5 ? (
        <canvas
          ref={canvasElRef}
          id={chartId}
          className="car-chart-canvas"
          style={{ width: '100%', height: `${chartHeight}px`, display: 'block' }}
          onClick={handleTouch}
        />
      ) : (
        Canvas ? (
          <Canvas
            canvasId={chartId}
            id={chartId}
            style={{ width: '100%', height: `${chartHeight}px` }}
            onTouchStart={handleTouch}
            onTouchMove={handleTouch}
            onTouchEnd={handleTouch}
          />
        ) : null
      )}
    </View>
  );
}
