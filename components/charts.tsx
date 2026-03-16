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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF6B6B', '#33CC99', '#9966CC']

interface AttendanceChartProps {
  data: Array<{ month: string; presents: number }>
}

export const AttendanceChart = ({ data }: AttendanceChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="presents" fill="#8884d8" name="Présents" />
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
        <Tooltip />
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
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="progress" stroke="#8884d8" name="Progression %" />
      </LineChart>
    </ResponsiveContainer>
  )
}

interface ServiceAttendanceChartProps {
  data: Array<{ name: string; présents: number; absents: number; total: number }>
}

export const ServiceAttendanceChart = ({ data }: ServiceAttendanceChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="présents" fill="#10b981" name="Présents" />
        <Bar dataKey="absents" fill="#ef4444" name="Absents" />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface LevelAttendanceChartProps {
  data: Array<{ name: string; présents: number; total: number }>
}

export const LevelAttendanceChart = ({ data }: LevelAttendanceChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="présents" fill="#8b5cf6" name="Présents" />
        <Bar dataKey="total" fill="#9ca3af" name="Total" />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface BranchAttendanceChartProps {
  data: Array<{ name: string; présents: number; total: number }>
}

export const BranchAttendanceChart = ({ data }: BranchAttendanceChartProps) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="présents" fill="#f59e0b" name="Présents" />
        <Bar dataKey="total" fill="#9ca3af" name="Total" />
      </BarChart>
    </ResponsiveContainer>
  )
}

// Exporter aussi les composants de base pour une utilisation directe
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