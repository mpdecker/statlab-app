# scripts/gen-reference.R
# Run from project root: Rscript scripts/gen-reference.R

library(jsonlite)

ref <- list(

  distributions = list(
    normalCDF = list(
      list(z =  0.00, expected = pnorm(0.00)),
      list(z =  1.96, expected = pnorm(1.96)),
      list(z = -1.96, expected = pnorm(-1.96)),
      list(z =  3.50, expected = pnorm(3.50)),
      list(z = -3.50, expected = pnorm(-3.50)),
      list(z = -4.00, expected = pnorm(-4.00))
    ),
    chiPVal = list(
      list(chi2 = 3.841,  df = 1,  expected = pchisq(3.841,  1,  lower.tail = FALSE)),
      list(chi2 = 5.991,  df = 2,  expected = pchisq(5.991,  2,  lower.tail = FALSE)),
      list(chi2 = 9.488,  df = 4,  expected = pchisq(9.488,  4,  lower.tail = FALSE)),
      list(chi2 = 0.001,  df = 1,  expected = pchisq(0.001,  1,  lower.tail = FALSE)),
      list(chi2 = 100.0,  df = 10, expected = pchisq(100.0,  10, lower.tail = FALSE))
    ),
    tPVal = list(
      list(t =  2.0,   df =   10, expected = 2 * pt(-abs( 2.0),    10)),
      list(t =  1.96,  df = 1000, expected = 2 * pt(-abs( 1.96),  1000)),
      list(t = 12.706, df =    1, expected = 2 * pt(-abs(12.706),    1)),
      list(t =  3.182, df =    3, expected = 2 * pt(-abs( 3.182),    3))
    ),
    fPVal = list(
      list(F = 18.51, df1 = 1, df2 =  1, expected = pf(18.51, 1,  1, lower.tail = FALSE)),
      list(F =  4.26, df1 = 1, df2 = 30, expected = pf( 4.26, 1, 30, lower.tail = FALSE)),
      list(F =  3.35, df1 = 2, df2 = 27, expected = pf( 3.35, 2, 27, lower.tail = FALSE))
    )
  ),

  means = list(
    tWelch_basic = local({
      a <- c(2, 4, 6, 8); b <- c(1, 3, 5)
      r <- t.test(a, b, var.equal = FALSE)
      list(a = a, b = b, t = unname(r$statistic), df = unname(r$parameter), p = r$p.value,
           ci_lo = r$conf.int[1], ci_hi = r$conf.int[2])
    }),
    tOne_basic = local({
      x <- c(3, 5, 7, 9, 11); mu0 <- 5
      r <- t.test(x, mu = mu0)
      list(x = x, mu0 = mu0, t = unname(r$statistic), df = unname(r$parameter), p = r$p.value)
    }),
    tPaired_basic = local({
      a <- c(10, 12, 9, 8, 11); b <- c(7, 10, 8, 6, 9)
      r <- t.test(a, b, paired = TRUE)
      list(a = a, b = b, t = unname(r$statistic), df = unname(r$parameter), p = r$p.value)
    })
  ),

  anova = list(
    oneWay_basic = local({
      g1 <- c(2, 3, 4); g2 <- c(5, 6, 7); g3 <- c(8, 9, 10)
      all <- c(g1, g2, g3)
      f <- c(rep("A",3), rep("B",3), rep("C",3))
      r <- summary(aov(all ~ factor(f)))[[1]]
      list(F = r[["F value"]][1], df1 = r$Df[1], df2 = r$Df[2], p = r[["Pr(>F)"]][1])
    }),
    kruskal_basic = local({
      g1 <- c(1,2,3); g2 <- c(4,5,6); g3 <- c(7,8,9)
      all <- c(g1,g2,g3); grp <- c(rep("A",3),rep("B",3),rep("C",3))
      r <- kruskal.test(all ~ factor(grp))
      list(H = unname(r$statistic), df = unname(r$parameter), p = r$p.value)
    })
  ),

  regression = list(
    pearson_basic = local({
      x <- c(1,2,3,4,5); y <- c(2,4,5,4,5)
      r <- cor.test(x, y)
      list(x = x, y = y, r = unname(r$estimate), t = unname(r$statistic),
           df = unname(r$parameter), p = r$p.value)
    }),
    simpleOLS_basic = local({
      x <- c(1,2,3,4,5); y <- c(2,4,5,4,5)
      m <- lm(y ~ x)
      s <- summary(m)
      list(x = x, y = y, b0 = unname(coef(m)[1]), b1 = unname(coef(m)[2]),
           r2 = s$r.squared, p = unname(coef(s)[2,4]))
    })
  ),

  categorical = list(
    chiSquare_2x2 = local({
      m <- matrix(c(10, 20, 30, 40), nrow = 2)
      r <- chisq.test(m, correct = FALSE)
      list(chi2 = unname(r$statistic), df = unname(r$parameter), p = r$p.value)
    }),
    fisher_2x2 = local({
      r <- fisher.test(matrix(c(5,2,1,8), nrow=2))
      list(p = r$p.value, OR = unname(r$estimate))
    }),
    mcnemar_basic = local({
      r <- mcnemar.test(matrix(c(10,3,7,20), nrow=2), correct=TRUE)
      list(chi2 = unname(r$statistic), p = r$p.value)
    })
  ),

  multivariate = list(
    cronbach_basic = local({
      m <- matrix(c(1,2,3,4, 2,3,4,5, 3,4,5,6, 4,5,6,7), nrow=4)
      df <- as.data.frame(m)
      # Cronbach alpha manually: k/(k-1) * (1 - sum(item_var)/total_var)
      k <- ncol(df)
      item_vars <- sapply(df, var)
      total_var <- var(rowSums(df))
      alpha <- k / (k - 1) * (1 - sum(item_vars) / total_var)
      list(alpha = alpha)
    })
  )
)

dir.create("src/tests/__fixtures__", recursive = TRUE, showWarnings = FALSE)
write_json(ref, "src/tests/__fixtures__/reference.json",
           digits = 8, auto_unbox = TRUE, pretty = TRUE)
cat("Written to src/tests/__fixtures__/reference.json\n")
