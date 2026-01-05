import { Controller, Get, Post, Body, Patch, Param, Delete, Req } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  create(@Req() req, @Body() createAccountDto: CreateAccountDto) {
    return this.accountsService.create(req.user.userId, createAccountDto);
  }

  @Get()
  findAll(@Req() req) {
    return this.accountsService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.accountsService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountsService.update(+id, updateAccountDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.accountsService.remove(+id);
  }
}
