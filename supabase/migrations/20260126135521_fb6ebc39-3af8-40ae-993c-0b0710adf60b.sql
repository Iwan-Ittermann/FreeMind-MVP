-- Create table for fake nodes that appear on the graph
CREATE TABLE public.fake_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
    opinion_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.fake_nodes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Fake nodes are publicly readable" 
ON public.fake_nodes 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage fake nodes" 
ON public.fake_nodes 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_fake_nodes_updated_at
BEFORE UPDATE ON public.fake_nodes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();