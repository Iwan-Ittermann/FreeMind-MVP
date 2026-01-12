const Index = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center max-w-2xl">
        <h1 className="mb-2 text-5xl font-medium tracking-tight text-foreground">
          FreeMind
        </h1>
        <p className="mb-8 text-xl text-muted-foreground">
          Free and Safe Online Conversations
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <button className="rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90">
            Get Started
          </button>
          <button className="rounded-lg border border-border bg-background px-6 py-3 font-medium text-foreground transition-colors hover:bg-muted">
            Learn More
          </button>
        </div>
        
        {/* Brand color showcase */}
        <div className="mt-16 flex justify-center gap-3">
          <div className="h-4 w-4 rounded-full bg-primary" title="Dogwood Rose" />
          <div className="h-4 w-4 rounded-full bg-secondary" title="Medium Blue" />
          <div className="h-4 w-4 rounded-full bg-accent" title="Honey Yellow" />
          <div className="h-4 w-4 rounded-full bg-success" title="Emerald Green" />
        </div>
      </div>
    </div>
  );
};

export default Index;
