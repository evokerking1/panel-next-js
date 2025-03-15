import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateApiKey(length: number): string {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }
    return result;
  }

export async function POST(request: Request) {
  const { cpu, daemonPort, disk, ipAddress, name, ram } = await request.json();

  if (!cpu || !daemonPort || !disk || !ipAddress || !name || !ram) {
    return NextResponse.json(
      { error: 'Missing fileds.' },
      { status: 400 }
    );
  }

  // Here is a need of Validation. Someone needs to implement checks for things like is ram negative etc.

  try {
        const key = generateApiKey(32);

        const node = await prisma.node.create({
        data: {
          name,
          ram: parseInt(ram),
          cpu: parseInt(cpu),
          disk: parseInt(disk),
          address: ipAddress,
          port: parseInt(daemonPort),
          key,
          createdAt: new Date(),
        },
      });

    return NextResponse.json({ message: 'Node created successfully.', node });

  } catch (error) {
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' + error },
      { status: 500 }
    );
  }
}