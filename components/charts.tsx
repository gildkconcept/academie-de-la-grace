'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'

const COLORS = ['#a8caff', '#67e8f9', '#fde68a', '#c4b5fd', '#6ee7b7', '#fca5a5']

interface AttendanceChartProps {
  data: Array<{ month: string; presents: number }>
}

export const AttendanceChart = ({ data }: AttendanceChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }} />
        <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(8,20,90,0.95)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            color: 'white',
            fontFamily: "'Crimson Text', Georgia, serif"
          }}
        />
        <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
        <Bar dataKey="presents" fill="#a8caff" name="Présents" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface CustomPieChartProps {
  data: Array<{ name: string; value: number }>
}

export const CustomPieChart = ({ data }: CustomPieChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(8,20,90,0.95)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            color: 'white',
            fontFamily: "'Crimson Text', Georgia, serif"
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

interface ProgressChartProps {
  data: Array<{ name: string; progress: number }>
}

export const ProgressChart = ({ data }: ProgressChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
        <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }} />
        <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.6)' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(8,20,90,0.95)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '12px',
            color: 'white',
            fontFamily: "'Crimson Text', Georgia, serif"
          }}
        />
        <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.7)' }} />
        <Line type="monotone" dataKey="progress" stroke="#a8caff" name="Progression %" strokeWidth={2} dot={{ fill: '#a8caff', r: 4 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
}