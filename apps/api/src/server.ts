import 'reflect-metadata'
import {
  BadRequestException,
  Catch,
  Controller,
  Get,
  HttpException,
  Inject,
  Module,
  NotFoundException,
  Param,
  Query,
  Res,
} from '@nestjs/common'
import type { ExceptionFilter, ArgumentsHost } from '@nestjs/common'
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import type { DynamicModule } from '@nestjs/common'
import { Injectable } from '@nestjs/common'
import type { CallHandler, NestInterceptor, ExecutionContext } from '@nestjs/common'
import { Observable, tap } from 'rxjs'
import { NestFactory } from '@nestjs/core'
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify'
import type { FastifyReply } from 'fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import {
  checkersWithCounts,
  themesWithCounts,
  listClaims,
  claimDetail,
  searchSnapshot,
  coverage as getCoverage,
  electionsWithCounts,
  statsForWindow,
  exportJson as makeExport,
  toCsv,
} from '@carimbo/core'

import { DEFAULT_DATA_FILE, fileStore, type StoreLogger, type StoreSource } from './store.js'

const STORE = Symbol('STORE')
const PUBLIC_CACHE = 'public, max-age=60, stale-while-revalidate=300'

@Injectable()
class CacheHeaders implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const reply = context.switchToHttp().getResponse<FastifyReply>()
    const request = context.switchToHttp().getRequest<{ url: string }>()
    return next.handle().pipe(
      tap(() => {
        if (request.url.startsWith('/v1/') && !reply.hasHeader('cache-control'))
          reply.header('cache-control', PUBLIC_CACHE)
      }),
    )
  }
}

@Catch()
class ApiErrors implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<FastifyReply>()
    const status = exception instanceof HttpException ? exception.getStatus() : 500
    const message = exception instanceof HttpException ? exception.message : 'Erro interno'
    reply
      .code(status)
      .header('cache-control', 'no-store')
      .send({
        statusCode: status,
        error:
          status === 404 ? 'Not Found' : status === 400 ? 'Bad Request' : 'Internal Server Error',
        message,
      })
  }
}

@Controller()
class ApiController {
  constructor(@Inject(STORE) private readonly store: StoreSource) {}

  @Get('health') healthCheck() {
    return { status: 'ok' as const }
  }
  @Get('v1/checkers') async checkerList() {
    return checkersWithCounts(await this.store.current())
  }
  @Get('v1/themes') async themeList() {
    return themesWithCounts(await this.store.current())
  }
  @Get('v1/claims') async claimList(@Query() query: Record<string, string>) {
    const limit = Number(query.limit ?? 20)
    if (!Number.isInteger(limit) || limit < 1 || limit > 100)
      throw new BadRequestException('Parâmetros inválidos')
    const offset =
      query.cursor === undefined
        ? 0
        : Number(Buffer.from(query.cursor, 'base64url').toString().replace(/^o:/, ''))
    if (!Number.isSafeInteger(offset) || offset < 0)
      throw new BadRequestException('Cursor inválido')
    const result = listClaims(await this.store.current(), query, offset, limit)
    return {
      items: result.items,
      total: result.total,
      nextCursor:
        result.nextOffset === null
          ? null
          : Buffer.from(`o:${String(result.nextOffset)}`).toString('base64url'),
    }
  }
  @Get('v1/claims/:slug') async claim(@Param('slug') slug: string) {
    const value = claimDetail(await this.store.current(), slug)
    if (!value) throw new NotFoundException('Alegação não encontrada')
    return value
  }
  @Get('v1/search') async search(@Query('q') q = '', @Query('limit') rawLimit = '20') {
    const limit = Number(rawLimit)
    if (
      q.trim().length < 3 ||
      q.length > 500 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    )
      throw new BadRequestException('Parâmetros inválidos')
    return searchSnapshot(await this.store.current(), q.trim(), limit)
  }
  @Get('v1/stats/today') async today(@Query('days') rawDays = '1') {
    const days = Number(rawDays)
    if (!Number.isInteger(days) || days < 1 || days > 30)
      throw new BadRequestException('Parâmetros inválidos')
    return statsForWindow(await this.store.current(), new Date(), days)
  }
  @Get('v1/elections') async electionList() {
    return electionsWithCounts(await this.store.current())
  }
  @Get('v1/coverage') async coverageList() {
    return getCoverage(await this.store.current(), new Date())
  }
  @Get('v1/export.json') async jsonExport(@Res({ passthrough: true }) reply: FastifyReply) {
    const data = await this.store.current()
    void reply.header('content-disposition', 'attachment; filename="carimbo-checagens.json"')
    return makeExport(data)
  }
  @Get('v1/export.csv') async csvExport(@Res({ passthrough: true }) reply: FastifyReply) {
    const data = await this.store.current()
    void reply.header('content-disposition', 'attachment; filename="carimbo-checagens.csv"')
    void reply.type('text/csv; charset=utf-8')
    return toCsv(data.reviews)
  }
}

function createStore(path = process.env.DATA_FILE ?? DEFAULT_DATA_FILE): StoreSource {
  const logger: StoreLogger = {
    info: (fields, message) => {
      console.info(message, fields)
    },
    warn: (fields, message) => {
      console.warn(message, fields)
    },
    error: (fields, message) => {
      console.error(message, fields)
    },
  }
  return fileStore(path, logger)
}

@Module({
  controllers: [ApiController],
  providers: [
    { provide: APP_FILTER, useClass: ApiErrors },
    { provide: APP_INTERCEPTOR, useClass: CacheHeaders },
  ],
})
class ApiModule {
  readonly name = 'ApiModule'
}

function apiModule(store: StoreSource): DynamicModule {
  return { module: ApiModule, providers: [{ provide: STORE, useValue: store }] }
}

export async function createApiApp(
  store: StoreSource = createStore(),
): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    apiModule(store),
    new FastifyAdapter({ logger: false }),
  )
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    methods: ['GET', 'HEAD'],
  })
  const swagger = SwaggerModule.createDocument(
    app,
    new DocumentBuilder().setTitle('Carimbo API').setVersion('0.0.0').build(),
  )
  SwaggerModule.setup('docs', app, swagger, { jsonDocumentUrl: 'docs/json' })
  return app
}

if (process.argv[1]?.endsWith('/dist/server.js') || process.argv[1]?.endsWith('/src/server.ts')) {
  const app = await createApiApp()
  await app.listen(Number(process.env.API_PORT ?? 3001), process.env.API_HOST ?? '127.0.0.1')
}
