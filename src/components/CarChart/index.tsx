// 车贷精算师 - F2 图表封装
// 策略：H5 端通过动态 import('@antv/f2') + React.createElement 构建图表（避免小程序端加载 F2）；
// 小程序端仅渲染占位提示，保证可编译通过。
import { useEffect, useRef } from 'react';
import { createElement } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import './index.less';

export type ChartKind = 'pie' | 'line' | 'bar';

export interface CarChartProps {
  kind: ChartKind;
  data: Record<string, any>[];
  height?: number;
  // pie / bar 维度字段
  nameField?: string; // 分类字段
  valueField?: string; // 数值字段
  // line / bar 系列字段（用于多系列着色）
  seriesField?: string;
}

const isWeb = Taro.getEnv() === Taro.ENV_TYPE.WEB;

export default function CarChart(props: CarChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<any>(null);

  const dataKey = JSON.stringify(props.data);

  useEffect(() => {
    if (!isWeb || !containerRef.current) return;
    let destroyed = false;
    let canvasEl: HTMLCanvasElement | null = null;

    const render = async () => {
      try {
        const F2 = (await import('@antv/f2')) as any;
        if (destroyed || !containerRef.current) return;
        const { Canvas, Chart, Interval, Line, Axis, Tooltip, Legend, Coord } = F2;

        const dpr = window.devicePixelRatio || 1;
        const width = containerRef.current!.clientWidth || 320;
        const height = props.height || 220;

        canvasEl = document.createElement('canvas');
        canvasEl.width = width * dpr;
        canvasEl.height = height * dpr;
        canvasEl.style.width = width + 'px';
        canvasEl.style.height = height + 'px';
        containerRef.current!.appendChild(canvasEl);
        const context = canvasEl.getContext('2d');
        if (!context) return;

        const h = createElement;
        const data = props.data.map((d) => ({ ...d, __c: 1 }));
        const nameField = props.nameField || 'name';
        const valueField = props.valueField || 'value';
        const seriesField = props.seriesField;

        let chartChildren: any[] = [];

        if (props.kind === 'pie') {
          chartChildren = [
            h(Axis, { visible: false }),
            h(Legend, { position: 'right' }),
            h(Coord, { type: 'polar' }),
            h(Interval, {
              x: '__c',
              y: valueField,
              color: nameField,
              adjustment: 'stack',
            }),
            h(Tooltip, {}),
          ];
        } else if (props.kind === 'line') {
          chartChildren = [
            h(Axis, { field: 'x' }),
            h(Axis, { field: 'y' }),
            h(Line, { x: 'x', y: 'y', color: seriesField || undefined }),
            h(Tooltip, {}),
          ];
        } else {
          // bar
          chartChildren = [
            h(Axis, { field: nameField }),
            h(Axis, { field: valueField }),
            h(Interval, { x: nameField, y: valueField, color: nameField || undefined }),
            h(Legend, { position: 'top' }),
            h(Tooltip, {}),
          ];
        }

        const chartEl = h(
          Canvas,
          { context, pixelRatio: dpr },
          h(Chart, { data }, ...chartChildren)
        );
        const chart = new Canvas(chartEl.props);
        chart.render();
        chartRef.current = chart;
      } catch (e) {
        console.warn('[CarChart] F2 渲染失败:', e);
      }
    };

    render();

    return () => {
      destroyed = true;
      try {
        chartRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      if (canvasEl && containerRef.current?.contains(canvasEl)) {
        containerRef.current.removeChild(canvasEl);
      }
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, props.kind, props.nameField, props.valueField, props.seriesField, props.height]);

  if (!isWeb) {
    return (
      <View className="car-chart-placeholder">
        <Text>图表需在 H5 端预览</Text>
      </View>
    );
  }

  return <View className="car-chart" ref={containerRef as any} />;
}
