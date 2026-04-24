import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);
    const startOfYesterday = startOfDay(subDays(today, 1));
    const endOfYesterday = endOfToday; // wait, no. endOfYesterday is subDays(endOfToday, 1)

    const results = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.aggregate({
        where: { payment_status: PaymentStatus.paid },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: { created_at: { gte: startOfToday, lte: endOfToday } },
      }),
      this.prisma.order.aggregate({
        where: {
          created_at: { gte: startOfToday, lte: endOfToday },
          payment_status: PaymentStatus.paid,
        },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: { created_at: { gte: startOfYesterday, lte: startOfToday } },
      }),
      this.prisma.order.aggregate({
        where: {
          created_at: { gte: startOfYesterday, lte: startOfToday },
          payment_status: PaymentStatus.paid,
        },
        _sum: { total: true },
      }),
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.orderItem.groupBy({
        by: ['product_name'],
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.prisma.order.groupBy({
        by: ['user_id'],
        where: { payment_status: PaymentStatus.paid },
        _sum: { total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.prisma.productVariant.findMany({
        where: { stock_quantity: { lte: 10 } },
        include: { product: true },
        take: 10,
      }),
    ]);


    const [
      totalOrders,
      totalRevenue,
      todayOrders,
      todayRevenue,
      yesterdayOrders,
      yesterdayRevenue,
      totalUsers,
      totalProducts,
      topProducts,
      topCustomersRaw,
      lowStock,
    ] = results as any[];

    // Fetch user details for top customers
    const topCustomers = await Promise.all(
      topCustomersRaw.map(async (tc: any) => {
        const user = await this.prisma.user.findUnique({
          where: { id: tc.user_id },
          select: { full_name: true, email: true },
        });
        return {
          ...user,
          total_spent: Number(tc._sum.total),
        };
      })
    );


    // 14-day history
    const history = await Promise.all(
      Array.from({ length: 14 }, (_, i) => {
        const d = startOfDay(subDays(today, 13 - i));
        const e = endOfDay(d);
        return this.prisma.order.aggregate({
          where: {
            created_at: { gte: d, lte: e },
            payment_status: PaymentStatus.paid,
          },
          _sum: { total: true },
          _count: { id: true },
        }).then(res => ({
          label: format(d, 'dd/MM'),
          revenue: Number(res._sum.total || 0),
          count: res._count.id,
        }));
      })
    );

    // Status distribution
    const statusDistribution = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return {
      total_orders: totalOrders,
      total_revenue: Number(totalRevenue._sum.total || 0),
      today: {
        orders: todayOrders,
        revenue: Number(todayRevenue._sum.total || 0),
      },
      yesterday: {
        orders: yesterdayOrders,
        revenue: Number(yesterdayRevenue._sum.total || 0),
      },
      total_users: totalUsers,
      total_products: totalProducts,
      top_products: topProducts.map(p => ({
        name: p.product_name,
        sold: p._sum.quantity,
        revenue: Number(p._sum.subtotal),
      })),
      top_customers: topCustomers,
      low_stock: lowStock.map(ls => ({
        id: ls.id,
        name: `${ls.product.name} (${ls.sku})`,
        stock: ls.stock_quantity,
        product_id: ls.product_id,
      })),
      history,

      status_distribution: statusDistribution.map(s => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  }
}
