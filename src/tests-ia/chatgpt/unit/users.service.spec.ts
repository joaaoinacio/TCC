// Testes gerados pelo ChatGPT para UsersService
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../../../users/entities/user.entity';
import { UsersService } from '../../../users/users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let usersRepository: any;

  beforeEach(() => {
    usersRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    service = new UsersService(usersRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('deve criar usuário com sucesso quando email não existe', async () => {
      const dto = {
        email: 'joao@email.com',
        password: '123456',
        name: 'João',
      };

      const hashedPassword = 'hashed-password';

      usersRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);
      usersRepository.create.mockReturnValue({
        ...dto,
        password: hashedPassword,
      });
      usersRepository.save.mockResolvedValue({
        id: '1',
        ...dto,
        password: hashedPassword,
      });

      const result = await service.create(dto as any);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: dto.email },
      });

      expect(bcrypt.hash).toHaveBeenCalledWith(dto.password, 10);

      expect(usersRepository.create).toHaveBeenCalledWith({
        ...dto,
        password: hashedPassword,
      });

      expect(usersRepository.save).toHaveBeenCalled();

      expect(result).toEqual({
        id: '1',
        ...dto,
        password: hashedPassword,
      });
    });

    it('deve lançar ConflictException quando email já estiver em uso', async () => {
      const dto = {
        email: 'joao@email.com',
        password: '123456',
      };

      usersRepository.findOne.mockResolvedValue({
        id: '1',
        email: dto.email,
      });

      await expect(service.create(dto as any)).rejects.toThrow(
        ConflictException,
      );

      await expect(service.create(dto as any)).rejects.toThrow(
        'Email already in use',
      );
    });

    it('deve propagar erro se password estiver inválido', async () => {
      const dto = {
        email: 'joao@email.com',
        password: '',
      };

      usersRepository.findOne.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockRejectedValue(
        new Error('Invalid password'),
      );

      await expect(service.create(dto as any)).rejects.toThrow(
        'Invalid password',
      );
    });
  });

  describe('findOne', () => {
    it('deve retornar usuário quando encontrado', async () => {
      const user = {
        id: '1',
        email: 'joao@email.com',
      };

      usersRepository.findOne.mockResolvedValue(user);

      const result = await service.findOne('1');

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });

      expect(result).toEqual(user);
    });

    it('deve lançar NotFoundException quando usuário não existir', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('1')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('1')).rejects.toThrow('User not found');
    });

    it('deve lançar erro para id vazio', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmail', () => {
    it('deve retornar usuário ao buscar por email', async () => {
      const user = { id: '1', email: 'joao@email.com' };

      usersRepository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('joao@email.com');

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'joao@email.com' },
      });

      expect(result).toEqual(user);
    });

    it('deve retornar null quando email não existir', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('invalido@email.com');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('deve atualizar usuário com sucesso sem alterar senha', async () => {
      const user = {
        id: '1',
        email: 'joao@email.com',
        name: 'João',
      };

      const dto = {
        name: 'João Atualizado',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(user as User);
      usersRepository.save.mockResolvedValue({
        ...user,
        ...dto,
      });

      const result = await service.update('1', dto as any);

      expect(service.findOne).toHaveBeenCalledWith('1');
      expect(usersRepository.save).toHaveBeenCalled();

      expect(result.name).toBe('João Atualizado');
    });

    it('deve atualizar senha com hash quando password for enviada', async () => {
      const user = {
        id: '1',
        email: 'joao@email.com',
        password: 'old',
      };

      const dto = {
        password: 'novaSenha',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(user as User);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-new-password');
      usersRepository.save.mockResolvedValue({
        ...user,
        password: 'hashed-new-password',
      });

      const result = await service.update('1', dto as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('novaSenha', 10);
      expect(result.password).toBe('hashed-new-password');
    });

    it('deve lançar ConflictException ao alterar para email já existente', async () => {
      const user = {
        id: '1',
        email: 'old@email.com',
      };

      const dto = {
        email: 'novo@email.com',
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(user as User);

      usersRepository.findOne.mockResolvedValue({
        id: '2',
        email: 'novo@email.com',
      });

      await expect(service.update('1', dto as any)).rejects.toThrow(
        ConflictException,
      );

      await expect(service.update('1', dto as any)).rejects.toThrow(
        'Email already in use',
      );
    });
  });

  describe('softDelete', () => {
    it('deve desativar usuário com sucesso', async () => {
      const user = {
        id: '1',
        email: 'joao@email.com',
        isActive: true,
      };

      jest.spyOn(service, 'findOne').mockResolvedValue(user as User);
      usersRepository.save.mockResolvedValue({
        ...user,
        isActive: false,
      });

      await service.softDelete('1');

      expect(service.findOne).toHaveBeenCalledWith('1');
      expect(user.isActive).toBe(false);
      expect(usersRepository.save).toHaveBeenCalledWith(user);
    });

    it('deve lançar NotFoundException ao tentar deletar usuário inexistente', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('User not found'));

      await expect(service.softDelete('999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
