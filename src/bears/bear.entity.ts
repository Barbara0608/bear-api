import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Color } from '../colors/color.entity';

@Entity()
export class Bear {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('int')
  size: number;

  @ManyToMany(() => Color, { onDelete: 'CASCADE' })
  @JoinTable({
    name: 'bear_colors',
    joinColumn: { name: 'bear_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'color_id', referencedColumnName: 'id' },
  })
  colors: Color[];
}
