import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { Role } from '../common/enums';
import { User } from './user.entity';

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  async create(input: CreateUserInput, role: Role = Role.Customer): Promise<User> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.users.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email is already registered');
    }
    const user = this.users.create({
      email,
      name: input.name.trim(),
      role,
      passwordHash: await bcrypt.hash(input.password, 10),
    });
    return this.users.save(user);
  }

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email: email.trim().toLowerCase() } });
  }

  async requireById(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  list(role?: Role): Promise<User[]> {
    return this.users.find({
      where: role ? { role } : {},
      order: { name: 'ASC' },
    });
  }

  async updateRole(actor: User, userId: string, role: Role): Promise<User> {
    if (actor.id === userId) {
      throw new BadRequestException('You cannot change your own role');
    }
    const user = await this.requireById(userId);
    if (user.role === Role.Admin && role !== Role.Admin) {
      const admins = await this.users.count({ where: { role: Role.Admin } });
      if (admins <= 1) {
        throw new BadRequestException('Cannot change the role of the last admin');
      }
    }
    user.role = role;
    return this.users.save(user);
  }
}
