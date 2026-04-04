import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

// PATCH — edit a sale's quantity and/or price
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { quantity, priceAtSale } = await req.json();

    if (quantity !== undefined && quantity <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 });
    }
    if (priceAtSale !== undefined && priceAtSale < 0) {
      return NextResponse.json({ error: "Price cannot be negative" }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!sale || sale.userId !== session.user.actualUserId) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const updates: { quantity?: number; priceAtSale?: number } = {};
    if (priceAtSale !== undefined) updates.priceAtSale = priceAtSale;

    if (quantity !== undefined && quantity !== sale.quantity) {
      const diff = quantity - sale.quantity; // positive = selling more, negative = selling less
      const newProductQty = sale.product.quantity - diff;

      if (newProductQty < 0) {
        return NextResponse.json(
          { error: `Not enough stock. Only ${sale.product.quantity} units available.` },
          { status: 409 }
        );
      }

      await prisma.$transaction([
        prisma.product.update({
          where: { id: sale.productId },
          data: { quantity: newProductQty },
        }),
        prisma.inventoryLog.create({
          data: {
            userId: session.user.actualUserId,
            productId: sale.productId,
            action: "Sale Edit",
            quantityChange: -diff,
            previousQty: sale.product.quantity,
            newQty: newProductQty,
          },
        }),
      ]);

      updates.quantity = quantity;
    }

    const updated = await prisma.sale.update({
      where: { id },
      data: updates,
      include: { product: { include: { category: true } } },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Sale PATCH error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — remove a sale and restore product stock
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!sale || sale.userId !== session.user.actualUserId) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const restoredQty = sale.product.quantity + sale.quantity;

    await prisma.$transaction([
      prisma.sale.delete({ where: { id } }),
      prisma.product.update({
        where: { id: sale.productId },
        data: { quantity: restoredQty },
      }),
      prisma.inventoryLog.create({
        data: {
          userId: session.user.actualUserId,
          productId: sale.productId,
          action: "Sale Deleted",
          quantityChange: sale.quantity,
          previousQty: sale.product.quantity,
          newQty: restoredQty,
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sale DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
