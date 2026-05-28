import { PartialType } from '@nestjs/swagger';
import { CreateCulinaryDto } from './create-culinary.dto';

export class UpdateCulinaryDto extends PartialType(CreateCulinaryDto) {}
